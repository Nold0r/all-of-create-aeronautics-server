import java.io.IOException;
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

/** Adds a null guard to Sable 2.0.3's entity sub-level lookup. */
public final class PatchSableNullGuard {
    private static final String TARGET_ENTRY =
            "dev/ryanhcode/sable/ActiveSableCompanion.class";
    private static final String TARGET_METHOD = "getTrackingSubLevel";
    private static final String TARGET_DESCRIPTOR =
            "(Lnet/minecraft/world/entity/Entity;)Ldev/ryanhcode/sable/sublevel/SubLevel;";

    private PatchSableNullGuard() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: PatchSableNullGuard <sable.jar>");
        }

        Path jar = Path.of(args[0]).toAbsolutePath().normalize();
        if (!Files.isRegularFile(jar)) {
            throw new IllegalArgumentException("Sable JAR does not exist: " + jar);
        }

        Path patchedJar = Files.createTempFile(jar.getParent(), "sable-null-guard-", ".jar");
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

        MethodNode target = classNode.methods.stream()
                .filter(method -> TARGET_METHOD.equals(method.name))
                .filter(method -> TARGET_DESCRIPTOR.equals(method.desc))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Target method was not found: " + TARGET_METHOD + TARGET_DESCRIPTOR));

        if (hasNullGuard(target)) {
            throw new IllegalStateException("Target method is already patched");
        }

        LabelNode entityIsPresent = new LabelNode();
        InsnList guard = new InsnList();
        guard.add(new VarInsnNode(Opcodes.ALOAD, 1));
        guard.add(new JumpInsnNode(Opcodes.IFNONNULL, entityIsPresent));
        guard.add(new InsnNode(Opcodes.ACONST_NULL));
        guard.add(new InsnNode(Opcodes.ARETURN));
        guard.add(entityIsPresent);
        target.instructions.insert(guard);

        ClassWriter writer = new SafeClassWriter(
                ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS);
        classNode.accept(writer);
        return writer.toByteArray();
    }

    private static boolean hasNullGuard(MethodNode method) {
        int[] expected = {
                Opcodes.ALOAD,
                Opcodes.IFNONNULL,
                Opcodes.ACONST_NULL,
                Opcodes.ARETURN
        };
        int index = 0;
        for (AbstractInsnNode instruction = method.instructions.getFirst();
             instruction != null && index < expected.length;
             instruction = instruction.getNext()) {
            if (instruction.getOpcode() < 0) {
                continue;
            }
            if (instruction.getOpcode() != expected[index++]) {
                return false;
            }
        }
        return index == expected.length;
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
