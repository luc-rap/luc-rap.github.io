---
layout: home
author_profile: true
---

# Welcome to My Portfolio

Hi, I'm Luc Rap, a developer and designer. This is my personal portfolio website.

## Featured Projects

{% for project in site.portfolio %}
  <h2><a href="{{ project.url }}">{{ project.title }}</a></h2>
  <p>{{ project.excerpt }}</p>
{% endfor %}

## About Me

Write a brief bio here.

## Contact

Feel free to reach out!
