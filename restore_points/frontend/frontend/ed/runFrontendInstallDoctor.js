import path from "path";
import { frontendInstallDoctor } from "./modules/frontendInstallDoctor.js";

const projectPath = path.resolve("../../");

frontendInstallDoctor(projectPath).then((result) => {
  if (result.ok) {
    console.log("[FID] Frontend is clean and bootable.");
    process.exit(0);
  } else {
    console.error("[FID] Frontend install doctor failed:", result.error);
    process.exit(1);
  }
});
