import { assertEquals } from "@std/assert";
import { join } from "@std/path";

Deno.test("--root option specifies custom root directory", async () => {
  // Create test structure
  const tempDir = await Deno.makeTempDir();
  const projectDir = join(tempDir, "my-project");
  const subDir = join(projectDir, "src");
  
  await Deno.mkdir(projectDir, { recursive: true });
  await Deno.mkdir(subDir, { recursive: true });
  
  // Create TODO files
  await Deno.writeTextFile(join(projectDir, "TODO.md"), `# TODO
## TODO
- [ ] Project root task
`);
  
  await Deno.writeTextFile(join(subDir, "TODO.md"), `# TODO
## TODO
- [ ] Src directory task
`);

  try {
    // Test 1: Without --root (from tempDir)
    const cmd1 = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        "--allow-env",
        "--allow-run",
        join(Deno.cwd(), "src/cli.ts"),
        projectDir,
        "--json",
      ],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { success: success1, stdout: stdout1, stderr: stderr1 } = await cmd1.output();
    const outputText1 = new TextDecoder().decode(stdout1);
    const errorText1 = new TextDecoder().decode(stderr1);
    console.log("Success:", success1);
    console.log("Output 1:", outputText1); // Debug
    console.log("Error 1:", errorText1); // Debug
    assertEquals(success1, true);
    const lines1 = outputText1.split('\n');
    let jsonLine1 = '';
    for (const line of lines1) {
      if (line.trim().startsWith('{')) {
        jsonLine1 = line;
        break;
      }
    }
    if (!jsonLine1) {
      throw new Error("No JSON output found in stdout1");
    }
    const output1 = JSON.parse(jsonLine1);
    assertEquals(output1.items.length, 2); // Should find both TODO.md files

    // Test 2: With --root option
    const cmd2 = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        "--allow-env",
        "--allow-run",
        join(Deno.cwd(), "src/cli.ts"),
        "--root",
        projectDir,
        "--json",
      ],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { success: success2, stdout: stdout2 } = await cmd2.output();
    assertEquals(success2, true);
    
    const outputText2 = new TextDecoder().decode(stdout2);
    const lines2 = outputText2.split('\n');
    let jsonLine2 = '';
    for (const line of lines2) {
      if (line.trim().startsWith('{')) {
        jsonLine2 = line;
        break;
      }
    }
    const output2 = JSON.parse(jsonLine2);
    assertEquals(output2.items.length, 2); // Should also find both TODO.md files

    // Test 3: --root with subdirectory
    const cmd3 = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        "--allow-env",
        "--allow-run",
        join(Deno.cwd(), "src/cli.ts"),
        "--root",
        subDir,
        "--json",
      ],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { success: success3, stdout: stdout3 } = await cmd3.output();
    assertEquals(success3, true);
    
    const outputText3 = new TextDecoder().decode(stdout3);
    const lines3 = outputText3.split('\n');
    let jsonLine3 = '';
    for (const line of lines3) {
      if (line.trim().startsWith('{')) {
        jsonLine3 = line;
        break;
      }
    }
    const output3 = JSON.parse(jsonLine3);
    assertEquals(output3.items.length, 1); // Should only find src/TODO.md

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("--root conflicts with --gitroot and --private", async () => {
  // Test --root with --gitroot
  const cmd1 = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-env",
      "--allow-run",
      join(Deno.cwd(), "src/cli.ts"),
      "--root",
      "/tmp",
      "--gitroot",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const { success: success1, stderr: stderr1, stdout: stdout1 } = await cmd1.output();
  // コマンドは成功し、エラーメッセージが標準出力に出る場合もある
  const error1 = new TextDecoder().decode(stderr1);
  const output1 = new TextDecoder().decode(stdout1);
  const combinedOutput = error1 + output1;
  assertEquals(combinedOutput.includes("Cannot use multiple location options"), true);

  // Test --root with --private
  const cmd2 = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-env",
      "--allow-run",
      join(Deno.cwd(), "src/cli.ts"),
      "--root",
      "/tmp",
      "--private",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const { success: success2, stderr: stderr2, stdout: stdout2 } = await cmd2.output();
  const error2 = new TextDecoder().decode(stderr2);
  const output2 = new TextDecoder().decode(stdout2);
  const combinedOutput2 = error2 + output2;
  assertEquals(combinedOutput2.includes("Cannot use multiple location options"), true);
});