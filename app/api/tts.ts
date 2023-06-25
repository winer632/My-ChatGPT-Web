// 代码来自  https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/how-to-speech-synthesis?tabs=nodejs%2Cterminal&pivots=programming-language-javascript
// For any server-based code, if you need to work with the data as a stream, you need to convert the ArrayBuffer object into a stream:
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { getServerSideConfig } from "../config/server";
import { PassThrough } from "stream";

export function tts(text: string) {
  "use strict";

  var subscriptionKey = process.env.TTS_KEY;

  var serviceRegion = "southeastasia";

  // we are done with the setup

  // now create the audio-config pointing to our stream and
  // the speech config specifying the language.
  // var audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
  if (subscriptionKey) {
    console.log("subscriptionKey is ", subscriptionKey);
    var speechConfig = sdk.SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion,
    );

    // The language of the voice that speaks.
    speechConfig.speechSynthesisLanguage = "zh-TW";
    speechConfig.speechSynthesisVoiceName = "zh-TW-HsiaoChenNeural";

    // create the speech synthesizer.
    // var speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig,audioConfig);
    var speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig);

    console.log("speak");

    speechSynthesizer.speakTextAsync(
      text,
      (result) => {
        const { audioData } = result;

        speechSynthesizer.close();

        // convert arrayBuffer to stream
        const bufferStream = new PassThrough();
        bufferStream.end(Buffer.from(audioData));
        return bufferStream;
      },
      (error) => {
        console.log(error);
        speechSynthesizer.close();
      },
    );
  } else {
    console.log("subscriptionKey is empty");
  }
}

// var text = "我们是一家人工智能领域的创新公司,致力于为全国13亿人科普最前沿的AI知识以及应用,以我们卓越的算法和工程能力将最前沿的AI技术使用门槛降到零,使得每个人都可以轻松体验到不可思议的AI技术";
// var text = "The Bank of England raised interest rates by half a percentage point Thursday, after data this week revealed surprisingly stubborn inflation. The move will pile pain on people with mortgages and put more downward pressure on house prices.";

// tts(text);
