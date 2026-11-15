import {
	ToneAudioNode,
	ToneAudioNodeOptions,
} from "../core/context/ToneAudioNode.js";
import { Cents, Frequency, Positive } from "../core/type/Units.js";
import { optionsFromArguments } from "../core/util/Defaults.js";
import { readOnly, RecursivePartial } from "../core/util/Interface.js";
import { Multiply } from "../signal/Multiply.js";
import { Signal } from "../signal/Signal.js";

export interface VoiceBusOptions extends ToneAudioNodeOptions {
	frequency: Frequency;
	detune: Cents;
	harmonicity: Positive;
}

/**
 * The pitch controls which every voice of an instrument exposes.
 */
export interface VoiceBusVoice {
	readonly frequency: Signal<"frequency">;
	readonly detune: Signal<"cents">;
}

/**
 * VoiceBus is the single place where the second voice of an instrument is
 * derived from the first one. The frequency written on the bus is multiplied by
 * the {@link harmonicity} to produce the second voice's frequency, and the
 * {@link detune} (in cents) written on the bus is applied to both voices.
 *
 * It is shared by {@link DuoSynth}, {@link AMSynth} and {@link FMSynth} so that
 * changing this wiring changes all of their second voices together. Instruments
 * without a second voice, like {@link Synth} and {@link MonoSynth}, do not use it.
 * ```
 * +-----------+     +-------------+
 * | frequency +>--->| harmonicity +>---> second voice frequency
 * +-----------+     +-------------+
 * +----------+
 * | detune   +>------------------------> both voices' detune
 * +----------+
 * ```
 * @category Instrument
 */
export class VoiceBus extends ToneAudioNode<VoiceBusOptions> {
	readonly name: string = "VoiceBus";

	/**
	 * The first voice's frequency.
	 */
	readonly frequency: Signal<"frequency">;

	/**
	 * The detune in cents which is written on the bus and applied to both voices.
	 */
	readonly detune: Signal<"cents">;

	/**
	 * Harmonicity is the ratio between the two voices. A harmonicity of
	 * 1 is no change. Harmonicity = 2 means a change of an octave.
	 */
	readonly harmonicity: Multiply<"positive">;

	readonly input: Signal<"frequency">;

	/**
	 * The second voice's frequency which is the first voice's frequency
	 * multiplied by the harmonicity.
	 */
	readonly output: Multiply<"positive">;

	constructor(options?: RecursivePartial<VoiceBusOptions>);
	constructor() {
		const options = optionsFromArguments(VoiceBus.getDefaults(), arguments);
		super(options);

		this.frequency = new Signal({
			context: this.context,
			units: "frequency",
			value: options.frequency,
		});
		this.detune = new Signal({
			context: this.context,
			units: "cents",
			value: options.detune,
		});
		this.harmonicity = new Multiply<"positive">({
			context: this.context,
			units: "positive",
			value: options.harmonicity,
			minValue: 0,
		});

		// the second voice's frequency is the first voice's frequency
		// multiplied by the harmonicity
		this.frequency.chain(this.harmonicity);

		this.input = this.frequency;
		this.output = this.harmonicity;

		readOnly(this, ["frequency", "detune", "harmonicity"]);
	}

	static getDefaults(): VoiceBusOptions {
		return Object.assign(ToneAudioNode.getDefaults(), {
			detune: 0,
			frequency: 0,
			harmonicity: 1,
		});
	}

	/**
	 * Connect the bus to an instrument's two voices. The first voice plays the
	 * frequency written on the bus and the second voice plays that frequency
	 * multiplied by the harmonicity. Both voices receive the detune written on
	 * the bus.
	 * @param primary The first voice.
	 * @param second The second voice.
	 */
	connectVoices(primary: VoiceBusVoice, second: VoiceBusVoice): this {
		this.frequency.connect(primary.frequency);
		this.harmonicity.connect(second.frequency);
		this.detune.fan(primary.detune, second.detune);
		return this;
	}

	dispose(): this {
		// frequency and harmonicity are disposed as the input and output of the node
		this.detune.dispose();
		super.dispose();
		return this;
	}
}
