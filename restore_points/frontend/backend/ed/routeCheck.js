import app from "../server.js";

console.log("=== Express Route Table ===");
app._router.stack.forEach((layer) => {
  if (layer.route) {
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods).join(", ");
    console.log(`${path}  [${methods}]`);
  }
});
