import fs from "fs";
import path from "path";

export async function scanEnv(projectRoot) {
  const envFile = path.join(projectRoot, ".env");

  if (!fs.existsSync(envFile)) {
    return [
      {
        type: "warning",
        message: ".env file missing"
      }
    ];
  }

  return [
    {
      type: "ok",
      message: ".env file present"
    }
  ];
}
