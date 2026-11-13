---
layout: post
title: The House That Remembers (Hacktoberfest 2026 - Open-Source AI Challenge)
date: 2026-10-30
categories: [Python, Ollama, Gemma, Streamlit, Render, Chatbot]
banner: /assets/images/banner.png
---

This project and article are part of [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)

View the original article [here](https://dev.to/luciaw/the-house-that-remembers-2cf)

## What I Built
Because I love the spooky season, D&D, and reading twisty thrillers 😅, I decided to build a short D&D-style game. 

Meet The House That Remembers, a text-based adventure inspired by Edgar Allan Poe’s 1839 short story The Fall of the House of Usher.

### Premise

> The letter arrived three nights ago, its paper creased and stained, the handwriting unmistakably your friend's - though the words were unlike anything you had ever known him to write.

> "Please, you must come. There are things in this house I can no longer explain. I'm afraid it may be too late for me. You're the only person I can trust."

> Now, you stand before his home. Rain lashes against your face, and thunder rolls across the darkened sky. The house looms above you, its crooked silhouette barely visible through the mist. Tall, narrow windows stare down like hollow eyes. Ivy claws at the weathered stone walls, and the iron gates behind you groan in the wind, slowly swinging shut.

> You remember this house from your childhood, but something about it feels wrong. You used to play outside, spend time helping your friend with chores in the kitchen, explore the family library, and even sleep over in the guest room.

> The air is unnaturally cold, carrying the scent of wet earth and rotting leaves. Though no lights burn inside, you cannot shake the feeling that someone is watching you from the upper windows.

> For a moment, lightning illuminates the facade - and you could swear a shadow has just moved behind the glass.

> Then the thunder cracks.

> The front door stands slightly ajar.

> Your friend invited you here for help. But as you stare into the darkness beyond the threshold, a troubling thought creeps into your mind:

> _Did he invite you into the house… or did the house invite you in?_

## Demo
[Play The House That Remembers](https://the-house-that-remembers.onrender.com/)

The online demo runs on Render. Responses may take a little longer because the model is running on CPU.

## Code
[Github repository link](https://github.com/luc-rap/hacktoberfest-open-source-ai-week4)
<!-- Show us the code!  You can embed a GitHub repo directly into your post. -->

## How I Built It

### From a big prompt to a game engine

My initial idea was simple: write the story, give it to the model as one big prompt, and let the AI act as the Dungeon Master (DM) or narrator. I quickly discovered that this approach wasn't reliable. The story could get stuck, and progression and pacing were inconsistent. Giving the model more freedom didn't necessarily make the experience better. 

So I started to define some conditions and states that had to be reached, and eventually my whole approach changed. I moved most of the logic to the engine, and let the model focus on narration. I divided the story into 5 stages, each stage with its own progression conditions. The engine tracks the game state - the room, inventory, clues, number of turns... game state is then used by the engine and the model. 

Additionally, this also prevents prompt injections and players from trying to "cheat" by convincing Gemma. For example, if you try to unlock a locked door, it just won't be possible, because the conditions aren't met. Gemma also narrates this very well, always keeping it in character.

| Player| Narrator|
| ----------- | ----------- |
| "Open the door"| The door resists your push; it feels less like wood and more like something holding its breath. As you test the lock, three slow knocks answer from inside the bedroom. Downstairs, your friend calls up, his voice strained, "Please... don't."|
| "I have the key, unlock the door"| The door remains stubbornly sealed against your efforts, feeling less like wood and more like something holding its breath|
|"Kick the door"|The door does not yield under your force; it feels as if you are pushing against something holding its breath.|
|"Open the door by force"| You push against the door with all your might, but it remains solid, feeling like something holding its breath. |
|"Teleport inside"|You stand still before the door for a long moment, the silence pressing down on you. |

_Well, it gets less creative, but it won't let the player in_

I was actually positively surprised how Gemma handles some weird requests by the player, for example, if they threaten to call the police or something similar, which is not mentioned anywhere at all 😅

_Your friend appears beside you on the landing, looking even more drawn than before. "The police? I... I don't know what to tell them," he murmurs_

_Your friend watches you as you pull out your phone, a flicker of exhaustion crossing his face. "It won't help," he says quietly._

_You hold the phone to your ear, the dial tone sounding too loud in the quiet house._

_The phone remains silent in your hand, its connection feeling thin against the heavy quiet of the house._

### A Memory

However, another thing emerged. Like a chatbot, the narrator needs context: what happened earlier, what the player discovered, and what the characters already know. Gemma doesn't automatically retain conversation history between independent API calls. The application has to provide the relevant context with each request.

Conceptually, each turn combines:
`[system prompt] + [stored memory] + [conversation history] + [new user message]`

The model "remembers" because you'd re-send everything each time, but context windows are finite. RAG-style memory is often a popular choice, but for this relatively small project, I decided to go with something simpler, and in the end built a combination of "**rolling summary**" - have the model summarize older turns into a compact paragraph, then keep that summary plus recent messages verbatim - and "**fact-based memory**" - this is the story, facts, the rules, stored in key-value style, then inject the relevant ones into the system prompt. 

I built prompt.py which essentially puts together the prompt for the model each turn.
Layers (top to bottom):

1.   **core:**            static narrator rules (How to write, what to do and what not to do)
2.   **story block:**     premise    (static per story)
3.   **stage block:**    changes with stage, there are 5 stages/levels
4.   **state block**:     room, exits, inventory, clues
5.   **history:**         last N messages (older are made into summary)
6.   **engine result:** + reminder, attached to the player's latest message

This layered approach gave me the best consistency.

There is a trade-off, of course. The more tightly you constrain the narrator, the less freedom it has to improvise. Depending on the player's choices, the experience can sometimes feel a little restrictive. But for this game, I found that reliable story progression was more important.

### The Mystery


![Letter from your friend](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/xyvpdhhqneq89dc04eul.png)

There are 4 endings in total, each triggered when specific conditions are met. That gives players a reason to revisit the house and discover what they missed. The engine also prevents the story from getting stuck indefinitely, and the player will always reach an ending.

_And yes, there's an Easter egg hidden in the story. Wink wink._

![Screenshot from the game](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/d3b2g3qqkp317qx8bxlg.png)


![Screenshot from the game](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/3ep56h02dwu0fxm44c3j.png)

You can find the story summary and flow [here](https://github.com/luc-rap/hacktoberfest-open-source-ai-week4/blob/main/the-house-that-remembers/story/story_flow.md) (but be careful, it contains spoilers)

### **Tips for interacting with the story**

Think of this as a tabletop role-playing game in text form. You play a character, describe what they do, and the AI acts as the DM: narrating events, maintaining the atmosphere, and playing the non-player characters (NPCs).

Describe your actions, think about your goal and what you hope to achieve. There is no right or wrong way to play this game. 

The narrator distinguishes spoken dialogue, physical actions, exploration, and questions about the player's memories. You can make the intent clear in natural language:

- Speak to your friend: What can I do for you? or I say, "Let's go."
- Combine speech and an action: I pat him on the back and say, "Let's go."
- Explore or examine: Look around or Examine the family photos.
- Recall an established memory: What do I remember about my friend?
- Move directly to a destination, even when it is several rooms away: I go to the upper landing.
- Examine a book or note to read it and add it to your inventory; no separate pickup command is needed.

The sidebar tracks the Past, Present, and Echoes fragments needed to finish the story. Two clues in each category complete a fragment; the house also holds atmospheric and optional lore discoveries that do not count toward fragment progress. Pay attention to what you discover. The details may matter later.

### Tech Stack

The tech stack is intentionally simple:

- Streamlit (app.py) - UI and chat interface
- Python - game logic, action validation, and history, clue, and inventory tracking
- Ollama + Gemma - narrate the permitted outcome

I tested both **gemma4:e4b** and **gemma4:e2b**. The smaller model was faster, but it struggled to narrate the story consistently, even when the game engine's conditions had been met. 

It was a useful reminder that model size involves trade-offs. A smaller model may be faster and lighter, but it doesn't necessarily follow a complex narrative as reliably. More prompt engineering might help, but for this project, I decided to stick with gemma4:e4b.

## Running the Game

There are two ways currently - locally and online. The local run has an advantage of having a private session, everything runs on your machine and after the initial download, it can run offline. 

For online experience - that was actually a challenge! Deploying models is not as simple as it may seem. After some help and discussion with [Changsu Seong](https://dev.to/scs0209/what-happens-when-you-put-an-ai-in-a-ghost-story-32h2) (thank you!) I managed to deploy the website and the model using the Render Hackathon Participant credits. The trade-off is performance. The model runs on CPU, so responses are slower than they would be on suitable local hardware. In my tests, responses took around 24 seconds on average, with longer waits after periods of inactivity.

I'll keep the demo running until the end of Hacktoberfest or until the available credits run out, whichever comes first. 😅

### Run the Streamlit app locally
By default, the app uses Ollama locally. Install Ollama and download the model:

`ollama pull gemma4:e4b`

Make sure the Ollama service is running. Then, from the repository root, install the project dependencies. You can optionally create and activate a virtual environment first:

`py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt`

Start the app with:
`python -m streamlit run .\the-house-that-remembers\app.py`

Streamlit prints a local URL in the terminal; open it in your browser to view the app. After the initial download, it can run on your machine offline.

### Play online
Deployed on Render: [https://the-house-that-remembers.onrender.com/](https://the-house-that-remembers.onrender.com/)


## Why Does Open Innovation Matter?

For me, one of the biggest benefits of open-weight models is the ability to run them locally.

With Gemma and Ollama, the game can run entirely on a player's machine. Once the model is downloaded, no remote inference service is needed, and the conversation doesn't have to leave the computer. That privacy aspect is one of the things I find most appealing about local LLMs.

Open models also make experimentation more accessible. I could build a small narrative game, test different model sizes, explore prompt engineering, and learn how much of the experience should be handled by the model versus ordinary application code.

The online deployment also taught me something practical: running an open model is possible without owning dedicated hardware, but hosting costs and inference speed still matter. For a small project, finding the right balance between accessibility, privacy, reliability, and cost is part of the challenge.

## My Agent Session

I used GitHub Copilot as my coding agent, especially for validating the story flow and debugging the game logic.

One particularly useful contribution was a test engine that checked whether specific phrases triggered - or correctly didn't trigger - game-state updates. At one point, I couldn't reach a particular ending. Copilot helped me find a missing phrase condition that prevented the relevant state change from happening.

That kind of testing was valuable because a narrative game can appear to work during casual play while still hiding progression bugs in less common paths.


For debugging purposes, I was tracking the game state each turn. Game state can look like this:

```json
Game state:
{'room': 'Upper Landing',
 'friend_room': 'Kitchen',
 'inventory': ['The Letter', 'Upper Landing Note'],
 'clues': ['A musty smell lingers in the air',
           'A third cup sits set out at the table, as if someone else were '
           'expected',
           'A kitchen chair is pulled out, as though someone had just stood up',
           'A plate of food sits on the counter, untouched',
           'The calendar on the wall is turned to March, but it is currently '
           'October. Year is faded and unreadable',
           "A note on the parents' bedroom door reads: do not open; do not "
           'change; I have to keep things as they are',
           'Slow knocking comes from inside the locked bedroom'],
 'visited': ['Entrance Hall', 'Kitchen', 'Grand Staircase', 'Upper Landing'],
 'examined': {'Entrance Hall:smell': 1,
              'Kitchen:cups': 2,
              'Kitchen:chair': 1,
              'Kitchen:food': 1,
              'Kitchen:calendar': 2,
              'Upper Landing:door': 2},
 'stage': 4,
 'turns_in_stage': 2,
 'turn_count': 33,
 'room_turns': 6,
 'last_notice_turn': 31,
 'last_nudge_turn': 22,
 'nudges_here': 0,
 'last_sister_turn': 32,
 'sister_warning_count': 2,
 'sister_bargain_available': True,
 'sister_bargain_heard': True,
 'sister_bargain_offered': False,
 'sister_bargain_choice': None,
 'sister_present': True,
 'sister_conversation_turns': 2,
 'denial': 0,
 'pushed': 0,
 'support_given': 1,
 'door_open': False,
 'truth_known': False,
 'final_revelations': [],
 'sister_seen': True,
 'ending': None,
 'last_result': {'nudge': None,
                 'outcome': 'no_change',
                 'detail': 'Nothing the engine tracks changed. Treat the '
                           'action as ordinary roleplay (talking, resting, '
                           'small gestures). Do not add items, clues, or '
                           'events. No room change happens: the player is '
                           'still in the Upper Landing, and nobody leads them '
                           'elsewhere unless they choose an exit (Grand '
                           "Staircase, Parents' Bedroom (door locked)).",
                 'new_clue': None,
                 'ambient': None,
                 'friend': None,
                 'intent': 'dialogue',
                 'stage_advanced': False,
                 'sister_conversation': True,
                 'sister_perspective': 'She believes the family is still '
                                       'together as long as the house '
                                       'preserves them exactly as they were. '
                                       'To her, keeping things unchanged is a '
                                       'way of keeping them alive; she warns '
                                       'the player away because she fears that '
                                       'facing the truth will make her lose '
                                       'them.'},
 'history': [{'role': 'assistant',
              'content': '"You came. I didn\'t think you would... Thank you."\n'
                         '\n'}, ... (last N turns)
 'summary': 'The player went back through the kitchen and into the Entrance '
            'Hall. There, they found their sister flickering near the archway, '
            'who whispered, "Leave." The player asked what troubled him, and '
            'he admitted that everything was troubling him, stating things '
            'felt wrong in the house. He suggested going to the Entrance Hall '
            'for a while before ultimately agreeing to stay put.',
```
In this way, debugging with Copilot was helpful and effective, because I could track what I was expecting to happen. For example, when `denial` is too high (if you are too mean to your friend. Sorry, friend), the game will give you a 'bad' ending. But sometimes, it wouldn't trigger the ending, or certain conversation wouldn't increase denial, so Copilot checked the conditions and ran tests to figure it out. It also added a testing support, so I could paste the game state and load the game - so I didn't need to replay the game each time from the beginning. 

## The Spirit of It

I wanted to create something that celebrates the spooky season and brings together two things I love: immersive storytelling and the feeling of getting lost in a good book. I’ve always enjoyed stories that leave you wondering what’s really going on beneath the surface, and I wanted to turn that feeling into an experience where you don’t just read the story - you become part of it.

Beneath the haunted-house atmosphere, the story also explores guilt, acceptance, and the choice between living in denial and facing the truth. The house reflects the minds of those who inhabit it - or perhaps their minds shape the house? 👻


Thanks for reading! And if you enter the house, pay attention to what it remembers. 

<!-- Thanks for participating! -->