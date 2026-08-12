import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeSlip, normalizeSlipItem } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slipRows = await sql`SELECT * FROM slips WHERE id = ${id}`;
  if (!slipRows[0]) return NextResponse.json({ error: "תעודה לא נמצאה" }, { status: 404 });
  const slip = normalizeSlip(slipRows[0]);

  const itemRows = await sql`SELECT * FROM slip_items WHERE slip_id = ${id} ORDER BY id ASC`;
  const items = itemRows.map(normalizeSlipItem);

  return NextResponse.json({ ...slip, items });
}
