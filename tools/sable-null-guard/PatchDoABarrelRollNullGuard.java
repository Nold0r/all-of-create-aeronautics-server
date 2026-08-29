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
import org.objectweb.asm.tree.FieldInsnNode;
import org.objectweb.asm.tree.InsnList;
import org.objectweb.asm.tree.InsnNode;
import org.objectweb.asm.tree.JumpInsnNode;
import org.objectweb.asm.tree.LabelNode;
import org.objectweb.asm.tree.MethodInsnNode;
import org.objectweb.asm.tree.MethodNode;
import org.objectweb.asm.tree.VarInsnNode;

/** Guards Do a Barrel Roll camera hooks while Minecraft has no focused entity. */
public final class PatchDoABarrelRollNullGuard {
    private static final String TARGET_ENTRY =
            "nl/enjarai/doabarrelroll/mixin/client/roll/CameraMixin.class";
    private static final String OWNER =
            "nl/enjarai/doabarrelroll/mixin/client/roll/CameraMixin";
    private static final String CAPTURE_METHOD =
            "doABarrelRoll$captureTickDeltaAndUpdate";
    private static final String CAPTURE_DESCRIPTOR =
            "(Lnet/minecraft/world/level/BlockGetter;Lnet/minecraft/world/entity/Entity;"
                    + "ZZFLorg/spongepowered/asm/mixin/injection/callback/CallbackInfo;"
                    + "Lcom/llamalad7/mixinextras/sugar/ref/LocalFloatRef;)V";
    private static final String INTERPOLATE_METHOD =
            "doABarrelRoll$interpolateRollnt";
    private static final String INTERPOLATE_DESCRIPTOR =
            "(Lorg/spongepowered/asm/mixin/injection/callback/CallbackInfo;)V";

    private PatchDoABarrelRollNullGuard() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException(
                    "Usage: PatchDoABarrelRollNullGuard <do_a_barrel_roll.jar>");
        }

        Path jar = Path.of(args[0]).toAbsolutePath().normalize();
        if (!Files.isRegularFile(jar)) {
            throw new IllegalArgumentException("Mod JAR does not exist: " + jar);
        }

        Path patchedJar = Files.createTempFile(jar.getParent(), "dabr-null-guard-", ".jar");
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

        MethodNode capture = findMethod(classNode, CAPTURE_METHOD, CAPTURE_DESCRIPTOR);
        MethodNode interpolate = findMethod(
                classNode, INTERPOLATE_METHOD, INTERPOLATE_DESCRIPTOR);

        if (containsEntityNullGuard(capture, 2)
                || startsWithCameraEntityNullGuard(interpolate)) {
            throw new IllegalStateException("Target methods are already patched");
        }

        insertCaptureGuard(capture);
        insertInterpolateGuard(interpolate);

        ClassWriter writer = new SafeClassWriter(
                ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS);
        classNode.accept(writer);
        return writer.toByteArray();
    }

    private static MethodNode findMethod(ClassNode owner, String name, String descriptor) {
        return owner.methods.stream()
                .filter(method -> name.equals(method.name))
                .filter(method -> descriptor.equals(method.desc))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Target method was not found: " + name + descriptor));
    }

    private static void insertCaptureGuard(MethodNode method) {
        LabelNode focusedEntityExists = new LabelNode();
        InsnList guard = new InsnList();
        guard.add(new VarInsnNode(Opcodes.ALOAD, 2));
        guard.add(new JumpInsnNode(Opcodes.IFNONNULL, focusedEntityExists));
        guard.add(new VarInsnNode(Opcodes.ALOAD, 0));
        guard.add(new InsnNode(Opcodes.ICONST_0));
        guard.add(new FieldInsnNode(Opcodes.PUTFIELD, OWNER, "isRolling", "Z"));
        guard.add(new InsnNode(Opcodes.RETURN));
        guard.add(focusedEntityExists);

        AbstractInsnNode insertionPoint = null;
        for (AbstractInsnNode instruction = method.instructions.getFirst();
             instruction != null;
             instruction = instruction.getNext()) {
            if (instruction instanceof MethodInsnNode invocation
                    && "com/llamalad7/mixinextras/sugar/ref/LocalFloatRef"
                            .equals(invocation.owner)
                    && "set".equals(invocation.name)) {
                insertionPoint = instruction;
                break;
            }
        }
        if (insertionPoint == null) {
            throw new IllegalStateException("LocalFloatRef.set call was not found");
        }
        method.instructions.insert(insertionPoint, guard);
    }

    private static void insertInterpolateGuard(MethodNode method) {
        LabelNode cameraEntityExists = new LabelNode();
        InsnList guard = new InsnList();
        guard.add(new VarInsnNode(Opcodes.ALOAD, 0));
        guard.add(new FieldInsnNode(
                Opcodes.GETFIELD,
                OWNER,
                "entity",
                "Lnet/minecraft/world/entity/Entity;"));
        guard.add(new JumpInsnNode(Opcodes.IFNONNULL, cameraEntityExists));
        guard.add(new InsnNode(Opcodes.RETURN));
        guard.add(cameraEntityExists);
        method.instructions.insert(guard);
    }

    private static boolean containsEntityNullGuard(MethodNode method, int variable) {
        for (AbstractInsnNode instruction = method.instructions.getFirst();
             instruction != null;
             instruction = instruction.getNext()) {
            if (instruction instanceof VarInsnNode load
                    && load.getOpcode() == Opcodes.ALOAD
                    && load.var == variable
                    && firstOpcode(load.getNext()).getOpcode() == Opcodes.IFNONNULL) {
                return true;
            }
        }
        return false;
    }

    private static boolean startsWithCameraEntityNullGuard(MethodNode method) {
        AbstractInsnNode first = firstOpcode(method.instructions.getFirst());
        AbstractInsnNode second = firstOpcode(first.getNext());
        AbstractInsnNode third = firstOpcode(second.getNext());
        return first.getOpcode() == Opcodes.ALOAD
                && second instanceof FieldInsnNode field
                && field.getOpcode() == Opcodes.GETFIELD
                && "entity".equals(field.name)
                && third.getOpcode() == Opcodes.IFNONNULL;
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
