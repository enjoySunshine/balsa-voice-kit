import { expect } from "chai";
import { BasicTests } from "../../test/helper/Basic.js";
import { expectSamples, samplesAtTimes } from "../../test/helper/Samples.js";
import { AMSynth } from "./AMSynth.js";
import { DuoSynth } from "./DuoSynth.js";
import { FMSynth } from "./FMSynth.js";
import { Synth } from "./Synth.js";
import { VoiceBus } from "./VoiceBus.js";

/**
 * The options shared by the measurement tests: a sine oscillator with an
 * instantaneous attack which sustains for the duration of the measurement.
 */
function sineVoice(): any {
	return {
		oscillator: { type: "sine" },
		envelope: { attack: 0.001, decay: 0, sustain: 1 },
	};
}

/**
 * A DuoSynth voice with the filter held at 8000hz. The filter frequency is
 * driven by the filter envelope, so both the cutoff and the envelope are set
 * to 8000hz with no octave offset.
 */
function filteredVoice(): any {
	return Object.assign(sineVoice(), {
		filter: { frequency: 8000 },
		filterEnvelope: { baseFrequency: 8000, octaves: 0 },
	});
}

const DUO_SECOND_VOICE = [1.604, 1.376, -0.326, -1.703];
const DUO_SAME_VOICE = [1.254, 1.959, 0.771, -1.405];
const DUO_DETUNED = [1.396, -0.332, -1.712, -1.027];
const AM_POINTS = [0.132, 0.174, 0.046, -0.075];
const FM_POINTS = [0.237, 0.3, 0.118, -0.165];
const SINGLE_VOICE_DETUNED = [0.982, 0.374, -0.694, -0.999];

describe("VoiceBus", () => {
	BasicTests(VoiceBus);

	context("second voice", () => {
		it("piles a second DuoSynth voice on top at the harmonicity", () => {
			return samplesAtTimes(() => {
				const synth = new DuoSynth({
					harmonicity: 2,
					vibratoAmount: 0,
					voice0: filteredVoice(),
					voice1: filteredVoice(),
				}).toDestination();
				synth.triggerAttack(110, 0);
			}).then((samples) => {
				expectSamples(samples, DUO_SECOND_VOICE);
			});
		});

		it("pushes the AMSynth amplitude with the second voice", () => {
			return samplesAtTimes(() => {
				const synth = new AMSynth({
					harmonicity: 2,
					oscillator: { type: "sine" },
					modulation: { type: "sine" },
					envelope: { attack: 0.001, decay: 0, sustain: 1 },
					modulationEnvelope: {
						attack: 0.001,
						decay: 0,
						sustain: 1,
					},
				}).toDestination();
				synth.triggerAttack(110, 0);
			}).then((samples) => {
				expectSamples(samples, AM_POINTS);
			});
		});

		it("pushes the FMSynth frequency with the second voice", () => {
			return samplesAtTimes(() => {
				const synth = new FMSynth({
					harmonicity: 2,
					modulationIndex: 2,
					oscillator: { type: "sine" },
					modulation: { type: "sine" },
					envelope: { attack: 0.001, decay: 0, sustain: 1 },
					modulationEnvelope: {
						attack: 0.001,
						decay: 0,
						sustain: 1,
					},
				}).toDestination();
				synth.triggerAttack(110, 0);
			}).then((samples) => {
				expectSamples(samples, FM_POINTS);
			});
		});

		it("is wired by the same bus in all three instruments", () => {
			const duoSynth = new DuoSynth();
			const amSynth = new AMSynth();
			const fmSynth = new FMSynth();
			[duoSynth, amSynth, fmSynth].forEach((synth) => {
				// @ts-ignore the bus is private
				expect(synth._voiceBus).to.be.instanceOf(VoiceBus);
				// @ts-ignore the bus is private
				expect(synth.frequency).to.equal(synth._voiceBus.frequency);
				// @ts-ignore the bus is private
				expect(synth.detune).to.equal(synth._voiceBus.detune);
				// @ts-ignore the bus is private
				expect(synth.harmonicity).to.equal(synth._voiceBus.harmonicity);
			});
			duoSynth.dispose();
			amSynth.dispose();
			fmSynth.dispose();
		});
	});

	context("harmonicity", () => {
		it("plays both voices at the same pitch when the harmonicity is 1", () => {
			return samplesAtTimes(() => {
				const synth = new DuoSynth({
					harmonicity: 1,
					vibratoAmount: 0,
					voice0: filteredVoice(),
					voice1: filteredVoice(),
				}).toDestination();
				synth.triggerAttack(110, 0);
			}).then((samples) => {
				expectSamples(samples, DUO_SAME_VOICE);
			});
		});
	});

	context("detune", () => {
		it("detunes both DuoSynth voices when written on the bus", () => {
			return samplesAtTimes(() => {
				const synth = new DuoSynth({
					harmonicity: 2,
					vibratoAmount: 0,
					voice0: filteredVoice(),
					voice1: filteredVoice(),
				}).toDestination();
				synth.detune.value = 1200;
				synth.triggerAttack(110, 0);
			}).then((samples) => {
				expectSamples(samples, DUO_DETUNED);
			});
		});

		it("detunes a single voice which has no second voice", () => {
			return samplesAtTimes(() => {
				const synth = new Synth({
					oscillator: { type: "sine" },
					envelope: { attack: 0.001, decay: 0, sustain: 1 },
				}).toDestination();
				synth.detune.value = 1200;
				synth.triggerAttack(110, 0);
			}).then((samples) => {
				expectSamples(samples, SINGLE_VOICE_DETUNED);
			});
		});
	});

	context("voice specific controls", () => {
		it("only the DuoSynth has vibrato", () => {
			const duoSynth = new DuoSynth();
			const amSynth = new AMSynth();
			const fmSynth = new FMSynth();
			expect(duoSynth).to.have.property("vibratoAmount");
			expect(amSynth).to.not.have.property("vibratoAmount");
			expect(fmSynth).to.not.have.property("vibratoAmount");
			duoSynth.dispose();
			amSynth.dispose();
			fmSynth.dispose();
		});

		it("only the FMSynth has a modulation index", () => {
			const duoSynth = new DuoSynth();
			const amSynth = new AMSynth();
			const fmSynth = new FMSynth();
			expect(fmSynth).to.have.property("modulationIndex");
			expect(duoSynth).to.not.have.property("modulationIndex");
			expect(amSynth).to.not.have.property("modulationIndex");
			duoSynth.dispose();
			amSynth.dispose();
			fmSynth.dispose();
		});

		it("only the DuoSynth voices are filtered", () => {
			const duoSynth = new DuoSynth();
			const amSynth = new AMSynth();
			const fmSynth = new FMSynth();
			const synth = new Synth();
			expect(duoSynth.voice0).to.have.property("filter");
			expect(duoSynth.voice1).to.have.property("filter");
			expect(amSynth).to.not.have.property("filter");
			expect(fmSynth).to.not.have.property("filter");
			expect(synth).to.not.have.property("filter");
			duoSynth.dispose();
			amSynth.dispose();
			fmSynth.dispose();
			synth.dispose();
		});
	});

	context("dispose", () => {
		it("disposes its controls", () => {
			const bus = new VoiceBus();
			bus.dispose();
			expect(bus.disposed).to.be.true;
			expect(bus.frequency.disposed).to.be.true;
			expect(bus.detune.disposed).to.be.true;
			expect(bus.harmonicity.disposed).to.be.true;
		});
	});
});
