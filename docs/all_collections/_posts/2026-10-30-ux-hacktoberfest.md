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
[Github repository](https://github.com/luc-rap/hacktoberfest-open-source-ai-week4)
<!-- Show us the code!  You can embed a GitHub repo directly into your post. -->

## How I Built It

### From a big prompt to a game engine

My initial idea was simple: write the story, give it to the model as one big prompt, and let the AI act as the Dungeon Master (DM) or narrator. I quickly discovered that this approach wasn't reliable. The story could get stuck, and progression and pacing were inconsistent. Giving the model more freedom didn't necessarily make the experience better. 

So I started to define some conditions and states that had to be reached, and eventually my whole approach changed. I moved most of the logic to the engine, and let the model focus on narration. I divided the story into 5 stages, each stage with its own progression conditions. The engine tracks the game state - the room, inventory, clues, number of turns... game state is then used by the engine and the model. 

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

There are 4 endings in total, each triggered when specific conditions are met. That gives players a reason to revisit the house and discover what they missed. The engine also prevents the story from getting stuck indefinitely, and the player will always reach an ending.

_And yes, there's an Easter egg hidden in the story. Wink wink._

![Screenshot from the game](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/d3b2g3qqkp317qx8bxlg.png)

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

```
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

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

## The Spirit of It

I wanted to create something that celebrates the spooky season and brings together two things I love: immersive storytelling and the feeling of getting lost in a good book. I’ve always enjoyed stories that leave you wondering what’s really going on beneath the surface, and I wanted to turn that feeling into an experience where you don’t just read the story - you become part of it.

Beneath the haunted-house atmosphere, the story also explores guilt, acceptance, and the choice between living in denial and facing the truth. The house reflects the minds of those who inhabit it - or perhaps their minds shape the house? 👻

Thanks for reading! And if you enter the house, pay attention to what it remembers. 