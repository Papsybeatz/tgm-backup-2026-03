export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer?: string;
};

export type Quiz = {
  id: string;
  title: string;
  questions: QuizQuestion[];
};
