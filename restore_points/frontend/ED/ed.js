import { Command } from "commander";
import { frontendInstallDoctor } from "./modules/frontendInstallDoctor.js";

const program = new Command();

program
  .command("frontend:install")
  .description("Run the Frontend Install Doctor to repair and reinstall the frontend environment")
  .action(async () => {
    console.log("\n🔧 Running Frontend Install Doctor...\n");

    const projectPath = process.cwd(); // auto-detect current folder
    const result = await frontendInstallDoctor(projectPath);

    if (result.ok) {
      console.log("\n✅ Frontend environment repaired and verified.\n");
    } else {
      console.log("\n❌ Frontend still failing to boot.\n");
      console.log("Error:", result.error);
    }
  });

program.parse(process.argv);
