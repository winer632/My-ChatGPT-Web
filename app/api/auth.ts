import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";
import { OPENAI_URL } from "./common";

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  console.log("[Auth] token:", token);
  const isOpenAiKey = !token.startsWith(ACCESS_CODE_PREFIX);
  console.log("[Auth] is openai key:", isOpenAiKey);
  return {
    accessCode: isOpenAiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isOpenAiKey ? token : "",
  };
}

let message = "";
let validation = "";

async function ValidityState(accessCode: string) {
  console.log("[Auth] ValidityState accessCode: ", accessCode);
  const result = await fetch("https://service.bizoe.tech/v1/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_key: accessCode,
    }),
  })
    .then((result) => {
      // Use json() method to parse response body as JSON
      return result.json();
    })
    .then((data) => {
      // Now data is an object with data property
      console.log("[Auth] Validity response data is ", data);
      message = data.message;
      validation = data.validation;
      console.log("[Auth] openai validity: ", message);
      console.log("[Auth] openai validation: ", validation);
    })
    .catch((error) => {
      console.error("[Auth] Validity request failed: error is ", error);
    });
}

export async function auth(req: NextRequest) {
  const authToken = req.headers.get("Authorization") ?? "";
  console.log("[Auth] got auth token:", authToken);
  console.log("[Auth] got auth token type:", typeof authToken);
  console.log("[Auth] got auth token length:", authToken.length);
  // check if it is openai api key or user token
  const { accessCode, apiKey: token } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  const serverConfig = getServerSideConfig();
  console.log("[Auth] allowed hashed codes: ", [...serverConfig.codes]);
  console.log("[Auth] serverConfig is ", serverConfig);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());
  console.log("[Auth] need code:", serverConfig.needCode);
  if (serverConfig.needCode === true) {
    console.log("serverConfig.needCode === true");
    if (accessCode === null || accessCode === "") {
      console.log("accessCode===null");
      validation = "fail";
    }

    switch (accessCode) {
      case "pi_3NG9fCCMTeU4V8Iq8K9ebIaJ":
      case "pi_3NKZZmCMTeU4V8Iq1VpRo27R":
      case "pi_3NLlsxCMTeU4V8Iq0JzyqIva":
      case "pi_3NLyqoCMTeU4V8Iq0RQA5TGE":
      case "pi_3NMnhbCMTeU4V8Iq02PVh5BY":
      case "pi_3NN5hhCMTeU4V8Iq1zQDewtq":
      case "pi_3NNBMcCMTeU4V8Iq1gOQn9DE":
      case "pi_3NNX6ZCMTeU4V8Iq02Fkv8D9":
      case "pi_3NNr50CMTeU4V8Iq1PmCQoA5":
      case "pi_3NNr4jCMTeU4V8Iq1Ohzqsky":
      case "pi_3NXyRjCMTeU4V8Iq0dfEuQJ7": // lizhenxing
      case "pi_3NfeaNCMTeU4V8Iq0frdmvXl":
      case "pi_3NpPBtCMTeU4V8Iq0o1NLDNF":
        validation = "success"; // Set validation to success if accessCode matches any of the cases
        break; // Break out of the switch statement
      default:
        validation = "failure"; // Set validation to failure if accessCode does not match any of the cases
    }
    console.log("before ValidityState, validation is ", validation);
    if (validation === "failure") {
      await ValidityState(accessCode);
    }
  }

  console.log("[Auth] got accessCode:", accessCode);
  console.log("[Auth] got token:", token);

  // 现在不判断页面上填写的CODE和环境变量或者.env中配置的CODE是否一致，只要填写了CODE就可以用来做有效期校验

  console.log("[Auth] validation is : ", validation);
  if (validation == "fail") {
    return {
      error: true,
      msg: !accessCode ? "empty access code" : "wrong access code",
    };
  }
  if (validation == "insufficient quota") {
    return {
      error: true,
      msg: message,
    };
  }

  // if user does not provide an api key, inject system api key
  if (!token) {
    const apiKey = serverConfig.apiKey;
    if (apiKey) {
      console.log("[Auth] use system api key");
      req.headers.set("Authorization", `Bearer ${apiKey}`);
    } else {
      console.log("[Auth] admin did not provide an api key");
    }
  } else {
    console.log("[Auth] use user api key");
  }

  return {
    error: false,
  };
}
