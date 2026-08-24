/**
 * One topic's worth of recorded practice, as `class_topic_evidence` returns it.
 * Counts only: the aggregate never carries a name, and nothing downstream can
 * turn it back into one.
 */
export type TopicEvidence = {
  topic: string;
  asked: number;
  missed: number;
  students: number;
};

export type ClassEvidence = {
  topics: TopicEvidence[];
  answered: number;
  students: number;
};

/**
 * How much practice has to exist before the readout says anything.
 *
 * Two students and twenty answers is not a lot, and it is not meant to be. It
 * is the point below which a confident sentence about "the class" is fiction:
 * one person having a bad afternoon should never turn into a teacher being
 * told their class does not understand osmosis.
 */
export const MIN_ANSWERS = 20;
export const MIN_STUDENTS = 2;

export function hasEnoughEvidence(evidence: ClassEvidence): boolean {
  return evidence.answered >= MIN_ANSWERS && evidence.students >= MIN_STUDENTS;
}

/** Miss rate as a fraction, guarding the empty-topic case. */
export function missRate(topic: TopicEvidence): number {
  return topic.asked === 0 ? 0 : topic.missed / topic.asked;
}

/**
 * The topics a teacher should look at, worst first.
 *
 * Ties break on the larger sample, so a topic eight students missed outranks
 * one that two did at the same rate. Topics nobody missed are dropped: a list
 * of things that are fine is not a list of things to do.
 */
export function rankTopics(topics: TopicEvidence[]): TopicEvidence[] {
  return topics
    .filter((topic) => topic.missed > 0)
    .sort((a, b) => missRate(b) - missRate(a) || b.asked - a.asked);
}
