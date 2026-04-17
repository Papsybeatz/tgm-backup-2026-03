import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function runAI(prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing in environment variables");
  }
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });

  return response.choices[0].message.content;
}
