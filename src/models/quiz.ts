export interface Quiz {
    id: string;
    title: string;
    isModule: boolean;
    isFinalQuiz: boolean;
    moduleId: string | undefined;
    difficulty: string | undefined;
    questions: Question[];
}

export interface Question {
    question: string;
    options: Option[];
}

export interface Option {
    option: string;
    isCorrect: boolean;
}
