import { REQUEST_TIMEOUT_MS } from "@/app/constant";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";

import { ChatOptions, getHeaders, LLMApi, LLMUsage } from "../api";
import Locale from "../../locales";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";
import { prettyObject } from "@/app/utils/format";
import https from "https";
import axios from "axios";

export class ChatGPTApi implements LLMApi {
  public ChatPath = "v1/chat/completions";
  // return “/api/openai/v1/chat/completions”.
  path(path: string): string {
    let openaiUrl = useAccessStore.getState().openaiUrl;
    if (openaiUrl.endsWith("/")) {
      openaiUrl = openaiUrl.slice(0, openaiUrl.length - 1);
    }
    return [openaiUrl, path].join("/");
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions) {
    const messages = options.messages.map((v) => ({
      role: v.role,
      content: v.content,
    }));

    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
      },
    };

    const requestPayload = {
      messages,
      stream: options.config.stream,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      presence_penalty: modelConfig.presence_penalty,
    };

    console.log("[Request] openai payload: ", requestPayload);

    const shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const chatPath = this.path(this.ChatPath);
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      console.log("[opeai] shouldStream is ", shouldStream);

      if (shouldStream) {
        let responseText = "";
        let finished = false;

        const finish = () => {
          if (!finished) {
            options.onFinish(responseText);
            finished = true;
          }
        };

        controller.signal.onabort = finish;

        fetchEventSource(chatPath, {
          ...chatPayload,
          async onopen(res) {
            clearTimeout(requestTimeoutId);
            const contentType = res.headers.get("content-type");
            console.log(
              "[OpenAI] request response content type: ",
              contentType,
            );

            if (contentType?.startsWith("text/plain")) {
              responseText = await res.clone().text();
              // console.log("1.responseText is ", responseText);
              return finish();
            }

            if (
              !res.ok ||
              !res.headers
                .get("content-type")
                ?.startsWith(EventStreamContentType) ||
              res.status !== 200
            ) {
              const responseTexts = [responseText];
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch {}

              if (res.status === 401) {
                responseTexts.push(Locale.Error.Unauthorized);
              }

              if (extraInfo) {
                responseTexts.push(extraInfo);
              }

              responseText = responseTexts.join("\n\n");

              return finish();
            }
          },
          onmessage(msg) {
            if (msg.data === "[DONE]" || finished) {
              return finish();
            }
            const text = msg.data;
            try {
              const json = JSON.parse(text);
              const delta = json.choices[0].delta.content;
              if (delta) {
                responseText += delta;
                // console.log("2.responseText is ", responseText);
                options.onUpdate?.(responseText, delta);
              } else {
                // console.log("3.responseText is ", responseText);
              }
            } catch (e) {
              console.error("[Request] parse error", text, msg);
            }
          },
          onclose() {
            finish();
          },
          onerror(e) {
            options.onError?.(e);
            throw e;
          },
          openWhenHidden: true,
        });
      } else {
        const res = await fetch(chatPath, chatPayload);
        clearTimeout(requestTimeoutId);

        const resJson = await res.json();
        const message = this.extractMessage(resJson);
        options.onFinish(message);
      }
    } catch (e) {
      console.log("[Request] failed to make a chat reqeust", e);
      options.onError?.(e as Error);
    }
  }
  async usage() {
    // get the access code from the store
    const accessCode = useAccessStore.getState().accessCode;
    // console.log("[Request] openai usage access code: ", accessCode);
    // create an agent that ignores self-signed certificates
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let message = "";
    console.log("[usage] begin");
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
        message = "valid until 2024-06-27 05:22:02";
        break; // Break out of the switch statement
      case "pi_3NXyRjCMTeU4V8Iq0dfEuQJ7":
        message = "valid until 2024-07-26 12:22:02";
        break;
    }
    console.log("[usage] message.length is ", message.length);
    if (message.length == 0) {
      // send a POST request with the payload and the agent
      const result = await axios.post(
        "https://service.bizoe.tech/v1/validity",
        {
          access_key: accessCode,
        },
        {
          httpsAgent: agent, // Pass the custom https agent as an option
        },
      );
      console.log(
        "[OpenAI]Validity request succeeded: response data is ",
        result.data,
      );

      message = result.data.message;
      let validation = result.data.validation;
      console.log("[Request] openai validity: ", message);
    }

    // return the total as LLMUsage
    return {
      used: 0, // you can change this to whatever you want
      total: message,
    } as LLMUsage;
  }
}
