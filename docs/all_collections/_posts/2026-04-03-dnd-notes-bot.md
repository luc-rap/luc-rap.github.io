---
layout: post
title: Dungeons & Dragons Notes Bot
date: 2026-04-03
categories: [Python, pyaudio, whisper, ollama]
banner: /assets/images/eberron.jpg
---

### Taking notes for Dungeons & Dragons

I love playing Dungeons & Dragons. We have a group that currently plays an Eberron campaign online - since 2023. It is definitely hard to remember sometimes what happened a few years ago. Every DnD player knows that you will have regrets if you don't take notes. Usually, taking notes is not something people volunteer for, since it takes away some attention from what's going on at the moment. Our party has our session notes shared on Notion. So I thought this would be a fun and useful project + I would learn and try out something new. 

![alt](/assets/images/eberron.jpg)

### Recording the audio

We play on Discord, so my initial idea was to create a Discord bot that could "take our notes". Under the hood, it meant something more like:

- Bot joins the voice channel and captures audio
- Transcription of the audio files
- LLM summarizes / write notes, and then posts the notes somewhere where everyone can see them (Notion)

One of my goals was to make everything local. No data is shared with other services, apart from sharing the notes to Notion. I had some experience with local LLMs (Ollama and LM Studio), so I wanted to give this a try. I also had experience with making Discord bots, although it was my first time trying out capturing voice chat audio. This also turned out to be the biggest obstacle. Discord announced:

> Last year, we introduced the DAVE protocol as our solution to bring end-to-end encryption ("E2EE" for short) to Discord's audio and video calls. Since then, DAVE has been providing E2EE for tens of millions of calls on Discord every single day. Today, we're excited to announce that we're bringing DAVE support to all our remaining platforms, including browsers, consoles and our Social SDK.

> Starting March 1st 2026, clients and apps without DAVE support will no longer be able to participate in Discord calls. This will complete our transition from last year’s experimental rollout to making DAVE the standard for Discord voice and video calls.

This change rolled out in March 2026, right around the time I started working on this project. Since I was using Pycord, the voice support hasn't been fully implemented, so I spent a lot of time trying to make this work without much success. In a way, it was fun to join the Pycord Discord and try to test out the latest PRs ~~(just to sadly tell them that the issue is still there. Poor Plate)~~. 

So as a temporary fix, I put aside the Discord bot and changed it to a script that records my microphone and system audio. This works quite well. Only difficult part was to make sure the microphone and system sudio record in the same time (import threading...)

Now, we have the audio and it's time for transcription. It was almost too easy. I remember back when I was working on my Bachelor thesis a few years ago, I was really struggling with Azure speech services, or essentially any service that won't ruin me financially and can transcribe audio. Whisper is free and open-source speech recognition system by OpenAI which runs locally, pretty easy to set-up (actually, I used Faster Whisper, but still) and you can choose from multiple models, for different sizes, speed and accuracy. Transcript looks good, however we lost the information about "who said what" by just recording my mic and system audio at the same time. Originally, Discord records people in the voice chat and outputs it into separate audio files for each user, which can be later synced up and would work well in this case. Labelling who said what in the transcript (it is called Speaker diarization) is something I am currently missing, but considering to add in the future.  

### LLM Time

![DnD bot pipeline diagram](/assets/images/dnd_bot_pipeline.svg)

So now having the transcript, I thought it would be pretty straightforward to just write a prompt "Hey summarize this" and be done, but my expectations changed very quickly. Summarization seems like a trivial use-case for LLMs, but

- The transcript was pretty long (I would not consider it a long document, but it was long enough to cause some issues)
- I tried different models and they all appeared to suffer from recency bias (summarizing in big detail what happened in the last 10% of the session)
- I tried feeding it some context, like the NPCs or character names, using Notion MCP as well as chromadb, but it kept hallucinating the MCP tools, and summarizing unrelevant parts from previous sessions

And I was making sure my context was large enough ... I was little lost. There is a map-reduce method in LangChain which basically splits it into chunks, summarizes the chunks and then summarizes all the chunks. When I tried this, it still only focused on the last chunk!

The best way so far was just keeping the individual chunks summarized (and for now I settled with qwen3:14b) basically skipping the reduce step. It isn't perfect, but it works well enough that I can use the results as actual notes. The only struggle right now is that I would have hoped the LLM could "figure out" the correct way to spell some names, based on the previous sessions or some context, but well...

> ...The area also featured a concentration of artisans, hinting at the presence of the House Kenneth artisan guild, though this was not immediately confirmed.  Proceeding toward the Dragon Towers district, the group recognized the towering guild halls of multiple dragon houses, including House Kenneth’s artisan guild, House Yorasko, House Sivis (notably associated with a newsletter service), and others. The area served as a central hub for dragon house operations, with each guild hall representing distinct specializations—ranging from protection (House Dennis) and healing (House Jorasko) to travel (House Lirandar) and detection (House Medani). The party noted the absence of a formal notice board in this district, as guild-specific interactions replaced general advertising...

Overall this was a fun project to build and it actually works, which is the bar I set for myself. It records, transcribes, and produces usable session notes that our party can reference on Notion.
RAG didn't bring the benefit I hoped for, and the recency bias in summarization is still something I want to solve. Getting speaker diarization working would make a big difference too - I think knowing who said what would help the LLM.
The Discord bot version is still the goal. Once Pycord fully supports the DAVE protocol, I'd like to bring it back to running in the voice channel rather than as a local script. From there, maybe some dream features? - querying past sessions, auto-updating NPC and location databases in Notion, maybe even a bot you can ask mid-session: "wait, what is House Sivis again?"
For now though, it does the job.

[You can check out this project on Github](https://github.com/luc-rap/Discord_Notes_Bot/tree/main)