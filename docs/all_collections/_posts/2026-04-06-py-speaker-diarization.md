---
layout: post
title: Speaker Diarization with WhisperX
date: 2026-06-04
categories: [Python, WhisperX, pyannote, Google Colab]
banner: /assets/images/speaker-diarization.png
---

### Dungeons & Dragons

Going again back to our [Dungeons and Dragons Notes](https://luc-rap.github.io/posts/dnd-notes-bot/) project, one of the ideas for improvement was to introduce **speaker diarization**, which might help us to improve the summaries. Speaker diarization helps us identify "who said what and when". Modern speaker diarization is performed by [neural networks](https://arxiv.org/abs/2101.09624).

We're already using local Whisper model for transcription, which does not natively support speaker diarization. [WhisperX](https://github.com/m-bain/whisperX) provides an improvement - automatic speech recognition with word-level timestamps and diarization. It uses [pyannote-audio](https://github.com/pyannote/pyannote-audio) in the background. 

There are a few catches, though. 
- It is a model, so to run it on larger audio, it would be beneficial to use GPU (but it is possible to use only CPU). Our audio files aren't too big, but they are sometimes more than 4 hours long. 
- I have AMD GPU, and while I can use ROCm with PyTorch, it is extra work and hassle and not fully supported by WhisperX.
- Services like Google Colab can handle this, even with the free tiers, but we lose our requirement to keep everything local. 

### Process

The purpose of this experiment is to test whether diarization improves our summaries - so as a "proof of concept", let's test this with some "fake" audio in Google Colab (there's a Colab extension in VSCode, letting you connect to high-powered Colab runtimes, so I will use this). We also need to upload our audio file directly to Colab/or Drive.

```python
from google.colab import drive
drive.mount('/content/drive')
audio_file = '/content/drive/MyDrive/<audio_file>'
```
WhisperX uses pyannote under the hood, which requires accepting the model terms on Hugging Face and generating an access token (for [speaker diarization](https://huggingface.co/pyannote/speaker-diarization-community-1). 

After dealing with some library dependencies (and when I thought I finally figured it out, but CUDA was still not available) ... we have our setup ready:

```python
# Transcribe and Align
model = whisperx.load_model("medium", device=device, compute_type=compute_type, language="en")
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=batch_size)

result = whisperx.align(result["segments"], align_model, metadata, audio, device=device)

# Diarize
diarize_model = whisperx.DiarizationPipeline(use_auth_token=HF_TOKEN, device=device)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
# It looks pretty simple, but I spent several hours just troubleshooting why numpy was failing and Cuda wasn't available...
```

It took 7 minutes to finish the transcription and aligment for 3hr long video (with medium model and the free Colab GPU). The diarization took around 9 minutes.

Let's look at the output
```json
{
    'start': 0.031, 'end': 4.152, 'text': ' what the others see.', 
    'words': 
    [
        {'word': 'what', 'start': 0.031, 'end': 0.651, 'score': np.float64(0.61)}, 
        {'word': 'the', 'start': 2.672, 'end': 2.752, 'score': np.float64(0.959)}, 
        {'word': 'others', 'start': 2.812, 'end': 3.252, 'score': np.float64(0.823)}, 
        {'word': 'see.', 'start': 3.852, 'end': 4.152, 'score': np.float64(0.974)}
    ], 
    'avg_logprob': -0.3021399417649145}
```

After diarization:
```json
{
    'start': 0.031, 'end': 4.152, 'text': ' what the others see.', 
    'words': 
    [
        {'word': 'what', 'start': 0.031, 'end': 0.651, 'score': np.float64(0.61), 'speaker': 'SPEAKER_00'}, 
        {'word': 'the', 'start': 2.672, 'end': 2.752, 'score': np.float64(0.959), 'speaker': 'SPEAKER_00'}, 
        {'word': 'others', 'start': 2.812, 'end': 3.252, 'score': np.float64(0.823), 'speaker': 'SPEAKER_00'}, 
        {'word': 'see.', 'start': 3.852, 'end': 4.152, 'score': np.float64(0.974), 'speaker': 'SPEAKER_00'}
        ], 
        'avg_logprob': -0.3021399417649145, 'speaker': 'SPEAKER_00'}
```

Listening to the session, Speaker 00 is the DM, and checking a few other segments, it seems to work pretty well. DM speaks the most, so most of it will be assigned to them. 

We will format and save the output, and then try the summarization and compare it with the previous one, to see if diarization gives us a relevant improvement. Actually as the labels are SPEAKER_00, SPEAKER_01 etc... we can assign the players to those labels, though the diarization is not 100%, so there might be some incorrect assignments anyway. Occasionally, it also wasn't able to assign a speaker, and we assigned it "Unknown" instead. The results will be saved to txt file, but since it's on the Colab server, we will have to download it to local machine. (Okay, the file was totally MIA and I could not find it anywhere, despite the code claiming the file was saved. So necessary tedious step - I uploaded to Drive and then downloaded it.) We're still using qwen3:14b for the summary.

### Conclusion
The diarization version was batter, but honestly the improvement was smaller than expected. The model limits are still the biggest bottleneck - even if the labels are perfect, LLM still needs to know what to do with them. The next step is probably prompt engineering. And one day, I would love to bring this back to fully local, fully automated pipeline, but for now, it works well enough that I actually use it, so I am still satisfied. 

![1](/assets/images/meme.jpeg)
