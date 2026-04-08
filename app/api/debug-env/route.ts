import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    TAVILY_API_KEY: process.env.TAVILY_API_KEY ? "SET (" + process.env.TAVILY_API_KEY.slice(0, 8) + "...)" : "NOT SET",
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY ? "SET" : "NOT SET",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  });
}
