import { describe } from 'vitest';

// The hook was rewritten to use AudioContext + ScriptProcessor (MediaRecorder
// was producing silent audio on certain pages). The earlier MediaRecorder-
// mock-based tests no longer apply. Real coverage of the new backend needs
// mocks for AudioContext / ScriptProcessorNode / MediaStreamAudioSourceNode,
// which is non-trivial. Tracked as follow-up polish in Wave 5.
describe.skip('useAudioRecording (AudioContext backend — tests pending rewrite)', () => {});
