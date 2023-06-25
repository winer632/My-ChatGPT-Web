// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { getServerSideConfig } from "../config/server";

export function tts(text: string) {
  // <code>
  "use strict";
  const serverConfig = getServerSideConfig();
  console.log("CODE is ", process.env.CODE);

  // replace with your own subscription key,
  // service region (e.g., "westus"), and
  // the name of the file you save the synthesized audio.
  let subscriptionKey = serverConfig.ttsKey ? serverConfig.ttsKey : "";
  console.log("tts.ts info is ", subscriptionKey);

  let filename = serverConfig.code ? serverConfig.code : "";
  if (filename === null || filename === "") {
    console.log("filename is empty");
    return;
  }
  console.log("filename is ", filename);

  var serviceRegion = "southeastasia";

  // we are done with the setup

  // now create the audio-config pointing to our stream and
  // the speech config specifying the language.
  var audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
  var speechConfig = sdk.SpeechConfig.fromSubscription(
    subscriptionKey,
    serviceRegion,
  );

  // The language of the voice that speaks.
  speechConfig.speechSynthesisLanguage = "zh-TW";
  speechConfig.speechSynthesisVoiceName = "zh-TW-HsiaoChenNeural";

  // create the speech synthesizer.
  let synthesizer: sdk.SpeechSynthesizer | undefined =
    new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  // start the synthesizer and wait for a result.
  if (synthesizer) {
    synthesizer.speakTextAsync(
      text,
      function (result) {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log("synthesis finished.");
        } else {
          console.error(
            "Speech synthesis canceled, " +
              result.errorDetails +
              "\nDid you update the subscription info?",
          );
        }
        if (synthesizer) {
          synthesizer.close();
          synthesizer = undefined;
        }
      },
      function (err) {
        console.trace("err - " + err);
        if (synthesizer) {
          synthesizer.close();
          synthesizer = undefined;
        }
      },
    );
  }
  console.log("Now synthesizing to: " + filename);

  // </code>
}

// var text = "我们是一家人工智能领域的创新公司,致力于为全国13亿人科普最前沿的AI知识以及应用,以我们卓越的算法和工程能力将最前沿的AI技术使用门槛降到零,使得每个人都可以轻松体验到不可思议的AI技术";
var text =
  "The Bank of England raised interest rates by half a percentage point Thursday, after data this week revealed surprisingly stubborn inflation. The move will pile pain on people with mortgages and put more downward pressure on house prices.";

// tts(text);
