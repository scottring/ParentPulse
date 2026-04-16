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
