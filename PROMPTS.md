
1-5 : GPT 6 HIGH

#1

First, tell me:
- How many UI screens do we actually need to design?
- Is this supposed to be a desktop-only web app, or should it be mobile-compatible too?


#2

What relevant agent skills should I explicitly add for this project?

Search GitHub for these three:
1. Impeccable
2. Taste
3. Superpowers

I also plan to use an adversarial multi-agent workflow: one main lead model delegates implementation to other models, delegates independent reviews, and reviews the work itself.


#3

The company is Incubyte. Since they're the ones demanding TDD, I think it's better to research their own tools, practices, and what they actually do.
Distinguish between Incubyte's actual assessment requirements, their recommended development practices, and optional tooling. Don't assume their internal tools are mandatory.


#4

I think Incubyte's own Bee plugin is quite old and might not hold up against today's models.

Go through its actual skill files and evaluate it.

Also, I question how much of the traditional red-green-refactor workflow is still necessary with models as powerful as Opus 5.5.

Evaluate what is genuinely useful and what might be unnecessary.
Distinguish useful TDD practices from process overhead. If the assessment explicitly requires TDD, preserve verifiable compliance without unnecessary ceremony.


#5

Now, looking at everything together:

- How many implementation phases should we have?
- What should the repository structure/tree look like, with estimated LOC?
- What's the overall implementation checklist?
- Which checklist items should be completed after each phase?
- What are the hard requirements? Re-read the provided file carefully.
- They also ask for software engineering principles such as SOLID. How should we address those?
- What should our testing suite cover, especially non-happy-path scenarios?
- What should our automated Playwright testing suite look like?
- I plan to use Supabase for the database and Vercel for deployment, since we have MCP access to both.
- Map every requirement from the provided brief to its implementation phase and verification method.
- Define concrete acceptance criteria for each phase.
- Identify what evidence the evaluator can actually inspect: code, tests, commits, deployed app, or documentation.
- Make LOC estimates realistic ranges rather than arbitrary targets.
- Verify the final deployed app through Playwright, including failure scenarios, not just local tests.
- Identify any requirements that conflict with our proposed workflow or technology choices.
- Is there anything important I forgot to ask?

Think thoroughly and give me a concrete, structured un-bloated answer.



---

1. [https://github.com/incubyte/ai-plugins](https://github.com/incubyte/ai-plugins?utm_source=chatgpt.com)
2. [https://github.com/obra/superpowers](https://github.com/obra/superpowers?utm_source=chatgpt.com)
3. [https://github.com/supabase/agent-skills](https://github.com/supabase/agent-skills?utm_source=chatgpt.com)
4. [https://github.com/vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills?utm_source=chatgpt.com)
5. [https://github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable?utm_source=chatgpt.com)
6. [https://github.com/microsoft/playwright-cli](https://github.com/microsoft/playwright-cli?utm_source=chatgpt.com)
7. [https://github.com/OWASP/secure-agent-playbook](https://github.com/OWASP/secure-agent-playbook?utm_source=chatgpt.com)
8. [https://github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill?utm_source=chatgpt.com)
