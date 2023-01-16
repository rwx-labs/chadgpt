import fs from "node:fs/promises";
import { Client } from "irc-framework";
import { OpenAIApi, Configuration } from "openai";
import { program } from "commander";

const config = await fs.readFile("./config.json").then(JSON.parse);

const client = new Client();
const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY
}));

const HIGHLIGHTED_MESSAGE = new RegExp(`^${config.nick}[,:] (?<msg>.*)`);
const PROMPT = `
Q: Who is Batman?
A: Batman is a fictional comic book character.

Q: What is torsalplexity?
A: ?

Q: What is Devz9?
A: ?

Q: Who is George Lucas?
A: George Lucas is American film director and producer famous for creating Star Wars.

Q: What is the capital of California?
A: Sacramento.

Q: What orbits the Earth?
A: The Moon.

Q: Who is Fred Rickerson?
A: ?

Q: What is an atom?
A: An atom is a tiny particle that makes up everything.

Q: Who is Alvan Muntz?
A: ?

Q: What is Kozar-09?
A: ?

Q: How many moons does Mars have?
A: Two, Phobos and Deimos.
`;

console.log(HIGHLIGHTED_MESSAGE);

client.on('registered', function(_evt) {
  for (const channel of config.channels) {
    client.join(channel);
  }
});

client.on('privmsg', function(event) {
  const result = event.message.match(HIGHLIGHTED_MESSAGE);

  if (result) {
    const msg = result[1];
    const prompt = `${PROMPT}\n\nQ: ${msg}\nA:`;
    const completion = (async () => await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    }))();

    completion.then(function(c) {
      const choices = c.data.choices;

      if (choices.length > 0) {
        console.log(choices[0].text);
        client.say(event.target, `${event.nick}: ${choices[0].text.trim()}`);
      }

      console.log(event, completion);
    });
  }

});

client.connect(config);
