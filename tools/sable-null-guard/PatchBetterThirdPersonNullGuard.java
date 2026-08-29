import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.AbstractInsnNode;
import org.objectweb.asm.tree.ClassNode;
import org.objectweb.asm.tree.InsnList;
import org.objectweb.asm.tree.InsnNode;
import org.objectweb.asm.tree.JumpInsnNode;
import org.objectweb.asm.tree.LabelNode;
import org.objectweb.asm.tree.MethodNode;
import org.objectweb.asm.tree.VarInsnNode;

/** Guards Better Third Person camera redirects while Minecraft has no focused entity. */
public final class PatchBetterThirdPersonNullGuard {
    private static final String TARGET_ENTRY =
            "io/socol/betterthirdperson/mixin/CameraMixin.class";
    private static final String CAMERA_HOOK_DESCRIPTOR =
            "(Lnet/minecraft/world/entity/Entity;F)F";

    private PatchBetterThirdPersonNullGuard() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException(
                    "Usage: PatchBetterThirdPersonNullGuard <better-third-person.jar>");
        }

        Path jar = Path.of(args[0]).toAbsolutePath().normalize();
        if (!Files.isRegularFile(jar)) {
            throw new IllegalArgumentException("Mod JAR does not exist: " + jar);
        }

        Path patchedJar = Files.createTempFile(jar.getParent(), "btp-null-guard-", ".jar");
        boolean targetFound = false;

        try (ZipFile input = new ZipFile(jar.toFile());
             OutputStream fileOutput = Files.newOutputStream(patchedJar);
             ZipOutputStream output = new ZipOutputStream(fileOutput)) {
            Enumeration<? extends ZipEntry> entries = input.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                byte[] contents;
                try (InputStream stream = input.getInputStream(entry)) {
                    contents = stream.readAllBytes();
                }

                if (TARGET_ENTRY.equals(entry.getName())) {
                    contents = patchClass(contents);
                    targetFound = true;
                }

                ZipEntry replacement = new ZipEntry(entry.getName());
                replacement.setTime(entry.getTime());
                output.putNextEntry(replacement);
                if (!entry.isDirectory()) {
                    output.write(contents);
                }
                output.closeEntry();
            }
        } catch (Throwable failure) {
            Files.deleteIfExists(patchedJar);
            throw failure;
        }

        if (!targetFound) {
            Files.deleteIfExists(patchedJar);
            throw new IllegalStateException("Target class was not found in " + jar);
        }

        Files.move(patchedJar, jar, StandardCopyOption.REPLACE_EXISTING);
        System.out.println("Patched " + jar);
    }

    private static byte[] patchClass(byte[] originalClass) {
        ClassNode classNode = new ClassNode();
        new ClassReader(originalClass).accept(classNode, 0);

        MethodNode yawHook = findMethod(classNode, "getYawHook");
        MethodNode pitchHook = findMethod(classNode, "getPitchHook");
        if (startsWithEntityNullGuard(yawHook) || startsWithEntityNullGuard(pitchHook)) {
            throw new IllegalStateException("Target methods are already patched");
        }

        insertEntityNullGuard(yawHook);
        insertEntityNullGuard(pitchHook);

        ClassWriter writer = new SafeClassWriter(
                ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS);
        classNode.accept(writer);
        return writer.toByteArray();
    }

    private static MethodNode findMethod(ClassNode owner, String name) {
        return owner.methods.stream()
                .filter(method -> name.equals(method.name))
                .filter(method -> CAMERA_HOOK_DESCRIPTOR.equals(method.desc))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Target method was not found: " + name + CAMERA_HOOK_DESCRIPTOR));
    }

    private static void insertEntityNullGuard(MethodNode method) {
        LabelNode entityExists = new LabelNode();
        InsnList guard = new InsnList();
        guard.add(new VarInsnNode(Opcodes.ALOAD, 1));
        guard.add(new JumpInsnNode(Opcodes.IFNONNULL, entityExists));
        guard.add(new InsnNode(Opcodes.FCONST_0));
        guard.add(new InsnNode(Opcodes.FRETURN));
        guard.add(entityExists);
        method.instructions.insert(guard);
    }

    private static boolean startsWithEntityNullGuard(MethodNode method) {
        AbstractInsnNode first = firstOpcode(method.instructions.getFirst());
        AbstractInsnNode second = firstOpcode(first.getNext());
        return first instanceof VarInsnNode load
                && load.getOpcode() == Opcodes.ALOAD
                && load.var == 1
                && second.getOpcode() == Opcodes.IFNONNULL;
    }

    private static AbstractInsnNode firstOpcode(AbstractInsnNode instruction) {
        AbstractInsnNode current = instruction;
        while (current != null && current.getOpcode() < 0) {
            current = current.getNext();
        }
        if (current == null) {
            throw new IllegalStateException("Expected bytecode instruction was not found");
        }
        return current;
    }

    private static final class SafeClassWriter extends ClassWriter {
        private SafeClassWriter(int flags) {
            super(flags);
        }

        @Override
        protected String getCommonSuperClass(String first, String second) {
            try {
                return super.getCommonSuperClass(first, second);
            } catch (RuntimeException ignored) {
                return "java/lang/Object";
            }
        }
    }
}
