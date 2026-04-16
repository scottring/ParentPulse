const assert = require("assert");
const sinon = require("sinon");
const { synthesizePrompt } = require("../../dinnerPrompts/synthesis");

describe("synthesis.synthesizePrompt", () => {
  it("returns a generated prompt when Claude responds successfully", async () => {
    const fakeClient = {
      messages: {
        create: sinon.stub().resolves({
          content: [{ type: "text", text: "When did you feel brave like Mia at swim?" }],
        }),
      },
    };
    const result = await synthesizePrompt({
      client: fakeClient,
      theme: "courage",
      audience: "kid",
      excerpts: [{ source: "journal", text: "Mia was brave at swim", firstName: "Mia" }],
    });
    assert.strictEqual(result.text, "When did you feel brave like Mia at swim?");
    assert.strictEqual(result.source, "synthesized");
    sinon.assert.calledOnce(fakeClient.messages.create);
    const call = fakeClient.messages.create.firstCall.args[0];
    assert.strictEqual(call.model, "claude-haiku-4-5-20251001");
  });

  it("trims whitespace from the model response", async () => {
    const fakeClient = {
      messages: { create: sinon.stub().resolves({ content: [{ type: "text", text: "  Hi?  \n" }] }) },
    };
    const result = await synthesizePrompt({
      client: fakeClient, theme: "courage", audience: "kid",
      excerpts: [{ source: "journal", text: "x", firstName: "Mia" }],
    });
    assert.strictEqual(result.text, "Hi?");
  });
});

describe("synthesis.synthesizeOrFallback", () => {
  const { synthesizeOrFallback } = require("../../dinnerPrompts/synthesis");

  it("returns the synthesized prompt on success", async () => {
    const client = {
      messages: { create: sinon.stub().resolves({ content: [{ type: "text", text: "Q?" }] }) },
    };
    const fallback = sinon.stub().returns({ id: "lib-1", text: "Lib?" });
    const result = await synthesizeOrFallback({
      client, theme: "courage", audience: "kid",
      excerpts: [{ source: "journal", text: "x", firstName: "Mia" }],
      libraryFallback: fallback,
    });
    assert.strictEqual(result.source, "synthesized");
    assert.strictEqual(result.text, "Q?");
    sinon.assert.notCalled(fallback);
  });

  it("returns the library fallback when Claude throws", async () => {
    const client = { messages: { create: sinon.stub().rejects(new Error("boom")) } };
    const fallback = sinon.stub().returns({ prompt: { id: "lib-1", text: "Lib?" }, relaxation: "none" });
    const result = await synthesizeOrFallback({
      client, theme: "courage", audience: "kid",
      excerpts: [{ source: "journal", text: "x", firstName: "Mia" }],
      libraryFallback: fallback,
    });
    assert.strictEqual(result.source, "library");
    assert.strictEqual(result.text, "Lib?");
    sinon.assert.calledOnce(fallback);
  });
});
