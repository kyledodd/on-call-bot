// Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework

let framework = require('webex-node-bot-framework');
const webhook = require('webex-node-bot-framework/webhook');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const app = express();
const moment = require('moment');
const axios = require('axios')
app.use(bodyParser.json());
app.use(express.static('images'));
const config = require("./config.json");

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

let responded = false;
let rotation = [
                    'aj.langlois@metlife.com',
                    'kyle.dodd@metlife.com',
                    'vvobbilichetty@metlife.com',
                    'cedric.smith@metlife.com',
                    'kyle.stephens1@metlife.com'
               ];
const IR_Tier3_room_id = 'e7efc2d0-97b7-11e9-8295-7bf0166225e8';
const bot_access_token = 'NWU5ZDZkNWYtMjQ2My00MDdiLThiOTMtNjBhNjE4NWFiZjUwYjE1MzU5OWMtZmZm_PF84_17e2335e-9ae4-439c-8209-df2210c7de3c';

// Process incoming messages
/* On mention with command
ex User enters @botname help, the bot will write back in markdown
*/
framework.hears('help', function (bot) {
  console.log(`someone needs help!`);
  responded = true;
  bot.say("markdown", 'These are the commands I can respond to:', '\n\n ' +
      '**who**  (get the name of the current METCIRT on-call person) \n' +
      '**rotation**  (get the rotation details) \n' +
      '**responsibilities**  (get the on-call responsibilities) \n' +
      '***assign @USER***  (swap the current on-call with the tagged @USER if they are in T3) \n' +
      '**alert**  (alerts the person next in the rotation of their upcoming on-call duty) \n' +
      '***skip***  (skips the current on-call. Take care using this, the next person may not appreciate unexpected schedule changes.) \n' +
      '***add user.email@metlife.com|First Name***  (adds user to end of rotation. Please use user.email@metlife.com|First Last for their name to keep the mentions from breaking.) \n' +
      '***remove @user***  (removes user from rotation.) \n' +
      '**dev** (get the developer details) \n' +
      '***about*** (get details about the bot) \n' +
      '**help** (what you are reading now)')
    .catch((e) => console.error(`Problem in help handler: ${e.message}`));
});

/* On mention with command
ex User enters @botname who, the bot will write back in markdown
*/
framework.hears('who', function (bot) {
    console.log("who command received");
    responded = true;
    bot.say("markdown", `The METCIRT on-call person is <@personEmail:${rotation[0]}>`)
        .catch((e) => console.error(`Problem in who handler: ${e.message}`));
});

/* On mention with command, using other trigger data, can use lite Markdown formatting
ex User enters @botname 'info' phrase, the bot will provide personal details
*/
framework.hears('dev', function (bot) {
    console.log("dev command received");
    responded = true;
    bot.say("markdown", 'This bot is maintained by <@personEmail:vvobbilichetty@metlife.com> from METCIRT. Reach out to him for feedback or feature requests')
        .catch((e) => console.error(`Problem in dev handler: ${e.message}`));
});

/* On mention with command, using other trigger data, can use lite Markdown formatting
ex User enters @botname 'rotation' phrase, the bot will provide the rotation details
*/
framework.hears('rotation', function (bot) {
    console.log("rotation command received");
    responded = true;
    let rotation_display = rotation.map(person => {
        return `<@personEmail:${person}>`;
    })
    let message = 'Here are the rotation details \n' + rotation_display.join('\n');
    bot.say("markdown", message)
      .catch((e) => console.error(`Problem in rotation handler: ${e.message}`));
});

/* On mention with command, using other trigger data, can use lite Markdown formatting
ex User enters @botname 'alert' phrase, the bot will provide the next week's on-call details
*/
framework.hears('alert', function (bot) {
    console.log("alert command received");
    responded = true;
    let message = `<@personEmail:${rotation[1]}>, please be advised that your on-call duty starts this Monday 9 AM ET.`;
    bot.say("markdown", message)
      .catch((e) => console.error(`Problem in alert handler: ${e.message}`));
});

/* runs ???At 2:00 pm on Friday.??? to alert an upcoming shift change
*/
cron.schedule('0 14 * * 5', () => {
    console.log("alert for shift change has been sent out");

    let message = `<@personEmail:${rotation[1]}>, your on-call duty starts on Monday.`;
    const data = JSON.stringify({
        "roomId": IR_Tier3_room_id,
        "markdown": message
    });

    axios
        .post('https://webexapis.com/v1/messages',
            JSON.stringify({
                "roomId": IR_Tier3_room_id,
                "markdown": message
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                    'Authorization': `Bearer ${bot_access_token}`
                }
            })
        .catch(error => {
            console.error(error);
        });
}, {
    scheduled: true,
    recoverMissedExecutions: false
});

/* runs ???At 9:00 AM on Monday.??? to announce a shift change
*/
cron.schedule('0 9 * * 1', () => {
    console.log("making shift change and announcing it");

    rotation.push(rotation.shift());
    let message = `<@personEmail:${rotation[0]}>, you are now on-call for this week.`;
    const data = JSON.stringify({
        "roomId": IR_Tier3_room_id,
        "markdown": message
    });

    axios
        .post('https://webexapis.com/v1/messages',
            JSON.stringify({
                "roomId": IR_Tier3_room_id,
                "markdown": message
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                    'Authorization': `Bearer ${bot_access_token}`
                }
            })
        .catch(error => {
            console.error(error);
        });
}, {
    scheduled: true,
    recoverMissedExecutions: false
});

/* On mention with command 'responsibilities'
ex User enters @botname 'details' phrase, bot will provide the details regarding on-call rotation and time
*/
framework.hears('responsibilities', function (bot) {
    console.log("responsibilities command received");
    responded = true;
    let link = 'https://my.metlife.com/sites/CyberSecurity-Tier3/_layouts/15/Doc.aspx?sourcedoc={2ef52a56-8635-4834-b90a-5eac426c5007}&action=edit&wd=target%28Team%20Info.one%7C748ea7db-c469-6246-ba69-1ebd186ca725%2FOn-Call%20Policy%7Ca5e2b24f-a141-6c48-a8b2-c1cf451d5b62%2F%29';
    bot.say("markdown", 'T3 On-Call responsibilities are as follows:\n' +
        'Shift Details: The on-call rotation starts at 9 AM Eastern on Mondays and lasts until same time the following Monday.\n' +
        'Responsibilities: Maintain 24/7 availability, watch for and ack critical escalations, may run point on high priority escalations.\n' +
        `Further: Monitor dashboards and lead weekly regional calls. Please see [OneNote](${link}) for further instruction.`)
        .catch((e) => console.error(`Problem in responsibilities handler: ${e.message}`));
});

/* On mention with command, assign @Mention
ex User enters @botname assign @Mention phrase, bot will set the current on-call to @Mention
*/
framework.hears('assign', function (bot, trigger) {
    console.log("assign command received");
    responded = true;
    let trigger_text = `${trigger.text}`;
    let name_array = trigger_text.split(" ");
    let name = name_array[2];
    name = name.replace(/\W/g, '');
    let rotation_length = rotation.length;
    for (let i = 0 ; i < rotation_length; i++) {
        let val = rotation[i];
        if (val.includes(name)) {
            rotation[i] = rotation[0];
            rotation[0] = val;
            bot.say("markdown", `The METCIRT on-call has been set to <@personEmail:${rotation[0]}>.\n` +
                `Please see the updated schedule with the ***rotation*** command. Thanks.`)
                .catch((e) => console.error(`Problem in assign handler: ${e.message}`));
            break;
        } else if (i === rotation_length - 1) {
            bot.say("markdown", "Either that name isn't in here or there's something wrong with the assign function. Please contact my dev.")
                .catch((e) => console.error(`Problem finding the person in assign handler: ${e.message}`));
        }
    }
});

/* On mention with command 'skip'
ex use @botname skip, bot will skip over the current user and cycle to the next.
 */
framework.hears('skip', function (bot) {
    console.log("skip command received");
    responded = true;
    rotation.push(rotation.shift());
    bot.say("markdown", `Skipped the current on-call. The new on-call is <@personEmail:${rotation[0]}>.`)
        .catch((e) => console.error(`Problem in skip handler: ${e.message}`));
})

/* On mention with command, 'add user.email@metlife.com|First Last'
ex use '@botname add kyle.dodd@metlife.com|Kyle Dodd' adds Kyle Dodd to the end of the rotation
 */
framework.hears('add', function (bot, trigger) {
    console.log("add command received");
    responded = true;
    let trigger_text = `${trigger.text}`;
    let name_array = trigger_text.split(" ");
    name_array.splice(0, 2);
    name = name_array.join(" ");
    rotation.push(name);
    bot.say("markdown", `<@personEmail:${name}> has been added to the on-call rotation.`);
});

/* On mention with command, 'remove @user'
ex use '@botname remove @User to remove @User from rotation'
 */
framework.hears('remove', function (bot, trigger) {
    console.log("remove command received");
    responded = true;
    let trigger_text = `${trigger.text}`;
    let name_array = trigger_text.split(" ");
    let name = name_array[2];
    name = name.replace(/\W/g, '');
    let rotation_length = rotation.length;
    for (let i = 0 ; i < rotation_length; i++) {
        let val = rotation[i];
        if (val.includes(name)) {
            rotation.splice(i, 1);
            bot.say("markdown", `The user:  <@personEmail:${rotation[0]}> has been removed from the on-call rotation.`);
            break;
        } else if (i == rotation_length - 1) {
            bot.say("markdown", "Either that name isn't in here or there's something wrong with the assign function. Please contact my dev.");
        }
    }
});

/* On mention with command 'about'
ex use @botname about to get some facts and what-not about this bot.
 */
//TODO

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
  res.send(`I'm alive. ${moment().format('YYYY-MM-DD hh:mm:ss A')}`);
});

app.post('/', webhook(framework));

let server = app.listen(config.port, function () {
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
