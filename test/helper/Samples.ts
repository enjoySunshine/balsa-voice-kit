import { expect } from "chai";
import { Offline } from "./Offline.js";

/**
 * The times at which the pitch of an instrument is measured.
 */
export const SAMPLE_TIMES = [0.001, 0.002, 0.004, 0.008];

/**
 * Render the instrument for 20ms and return its output at {@link SAMPLE_TIMES}.
 */
export async function samplesAtTimes(callback: () => void): Promise<number[]> {
	const buffer = await Offline(callback, 0.02);
	return SAMPLE_TIMES.map((time) => buffer.getValueAtTime(time) as number);
}

/**
 * Assert that each sample is within the tolerance of the expected value.
 */
export function expectSamples(
	actual: number[],
	expected: number[],
	tolerance = 0.05
): void {
	expect(actual.length).to.equal(expected.length);
	actual.forEach((value, index) => {
		expect(value, `sample at ${SAMPLE_TIMES[index]}s`).to.be.closeTo(
			expected[index],
			tolerance
		);
	});
}
