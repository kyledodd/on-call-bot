// Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework

let framework = require('webex-node-bot-framework');
const webhook = require('webex-node-bot-framework/webhook');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
app.use(express.static('images'));
const config = require("./config.json");
const fs = require('fs');

// init framework
framework = new framework(config);
framework.start().then();
console.log("Starting framework, please wait...");

framework.on("initialized", function () {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

// A spawn event is generated when the framework finds a space with your bot in it
// If actorId is set, it means that a user has just added your bot to a new space
// If not, the framework has discovered your bot in an existing space
framework.on('spawn', (bot, id, actorId) => {
  if (actorId) {
    // When actorId is present it means someone added your bot got added to a new space
    // Let's find out more about them..
    let msg = 'You can say `help` to get the list of words I am able to respond to.';
    bot.webex.people.get(actorId).then(() => {
      msg = `Hello there. ${msg}`;
    }).catch((e) => {
      console.error(`Failed to lookup user details in framework.on("spawn"): ${e.message}`);
      msg = `Hello there. ${msg}`;
    }).finally(() => {
      // Say hello, and tell users what you do!
      if (!bot.isDirect) {
        let botName = bot.person.displayName;
        msg += `\n\nIn order for me to see your messages in this group space, be sure to *@mention* ${botName}.`;
      }
      bot.say('markdown', msg);
    });
  } else {
    // don't say anything here or your bot's spaces will get spammed every time your server is restarted
    console.log(`While starting up, the framework found our bot in a space called: ${bot.room.title}`);
  }
});

// Process incoming messages
let responded = false;
let rotation_data = fs.readFileSync("rotation.json", "utf8");
var rotation = JSON.parse(rotation_data);
/*
let rotation = [
                'kyle.stephens1@metlife.com|Kyle Stephens',
                'aj.langlois@metlife.com|AJ Langlois',
                'kyle.dodd@metlife.com|Kyle Dodd',
                'vvobbilichetty@metlife.com|Vinay Vobbilichetty',
                'cedric.smith@metlife.com|Cedric Smith'
              ];
*/

/* On mention with command
ex User enters @botname help, the bot will write back in markdown
*/
framework.hears('help', function (bot) {
  console.log(`someone needs help!`);
  responded = true;
  bot.say("markdown", 'These are the commands I can respond to:', '\n\n ' +
      '**who**  (get the name of the current METCIRT on-call person) \n' +
      '**rotation**  (get the rotation details) \n' +
      '**set**  (set a different on-call outside of rotation) \n' +
      '**dev** (get developer details) \n' +
      '**responsibilities**  (get the on-call responsibilities) \n' +
      '**help** (what you are reading now)')
    .catch((e) => console.error(`Problem in help handler: ${e.message}`));
});

/* On mention with command
ex User enters @botname who, the bot will write back in markdown
*/
framework.hears('who', function (bot) {
  console.log("who command received");
  responded = true;
  bot.say("markdown", `The METCIRT on-call person is <@personEmail:${Object.values(rotation)[0]}>`);
});

/* On mention with command, using other trigger data, can use lite Markdown formatting
ex User enters @botname 'info' phrase, the bot will provide personal details
*/
framework.hears('dev', function (bot) {
  console.log("dev command received");
  responded = true;
  bot.say("markdown", 'This bot is maintained by <@personEmail:vvobbilichetty@metlife.com|Vinay Vobbilichetty> from METCIRT. Reach out to him for feedback or feature requests');
});

/* On mention with command, using other trigger data, can use lite Markdown formatting
ex User enters @botname 'info' phrase, the bot will provide personal details
*/
framework.hears('rotation', function (bot) {
  console.log("rotation command received");
  responded = true;
  //
  // I'm not sure if this will work. I think it might, but it's hard to test.
  //
  let rotation_display = Object.values(rotation).map(person => {
    return '<@personEmail:' + person + '>';
  })
  let message = 'Here are the rotation details \n' + rotation_display.join('\n');
  bot.say("markdown", message);
});

/* On mention with command, details
ex User enters @botname 'details' phrase, bot will provide the details regarding on-call rotation and time
*/
framework.hears('responsibilities', function (bot) {
    console.log("responsibilities command received");
    responded = true;
    link = 'https://my.metlife.com/sites/CyberSecurity-Tier3/_layouts/15/Doc.aspx?sourcedoc={2ef52a56-8635-4834-b90a-5eac426c5007}&action=edit&wd=target%28Team%20Info.one%7C748ea7db-c469-6246-ba69-1ebd186ca725%2FOn-Call%20Policy%7Ca5e2b24f-a141-6c48-a8b2-c1cf451d5b62%2F%29';
    bot.say("markdown", 'T3 On-Call responsibilities are as follows:\n' +
        'Shift Details: The on-call rotation starts at 9AM EST on Mondays and lasts until same time the following Monday.\n' +
        'Responsibilities: Maintain 24/7 availability, watch for and ack critical escalations, may run point on high priority escalations.\n' +
        `Further: Monitor dashboards and lead weekly regional calls. Please see [OneNote](${link}) for further instruction.`);
});

/* On mention with command, set @Mention
ex User enters @botname set @Mention phrase, bot will set the current on-call to @Mention
*/
framework.hears(/^.*set.*/i, function (bot)) {
    console.log("set command received");
    responded = true;
    let trigger_text = `${trigger.text}`;
    let name_array = trigger_text.split(" ");
    let name = rotation(name_array[2]);
    bot.say(`The On-Call is set to: <@personEmail:${name}`).catch((e) => console.error(`Problem in help handler: ${e.message}`));

}

/* On mention with unexpected bot command
   It's a good practice to gracefully handle unexpected input
*/
framework.hears(/.*/, function (bot, trigger) {
  // This will fire for any input so only respond if we haven't already
  if (!responded) {
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot.say(`Sorry, I don't know how to respond to "${trigger.text}". Use help for a list of available commands`)
      .catch((e) => console.error(`Problem in the unexpected command handler: ${e.message}`));
  }
  responded = false;
});

// Server config & housekeeping
// Health Check
app.get('/', function (req, res) {
  res.send(`I'm alive.`);
});

app.post('/', webhook(framework));

var server = app.listen(config.port, function () {
  framework.debug('framework listening on port %s', config.port);
});

// gracefully shutdown (ctrl-c)
process.on('SIGINT', function () {
  framework.debug('stopping...');
  server.close();
  framework.stop().then(function () {
    process.exit();
  });
});
