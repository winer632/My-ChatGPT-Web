import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenAI Route] req ", req);
  console.log("[OpenAI Route] params ", params);

  // Clone the request before consuming its body
  const requestClone = req.clone();
  const requestBody = await requestClone.json();
  const model = requestBody.model; // Accesses the model field from the JSON object
  console.log("[OpenAI Route] model is ", model);

  const authResult = await auth(req, model);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  try {
    return await requestOpenai(req);
  } catch (e) {
    console.error("[OpenAI] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
