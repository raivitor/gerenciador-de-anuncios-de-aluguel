import { NextResponse } from "next/server";
import anuncios from "@/data/anuncios.json";

export async function GET() {
  return NextResponse.json(anuncios);
}
