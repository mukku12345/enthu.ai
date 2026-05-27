import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = process.env.PORT || 5000;
const app = createApp();

await connectDatabase();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
