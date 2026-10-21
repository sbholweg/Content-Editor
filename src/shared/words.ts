// Filler words that "Cut ums & uhs" removes.
export const FILLER = /^(u+m+|u+h+|uhm+|erm+|hmm+|mm+|ah+)[,.!?]*$/i;

export const isFiller = (text: string) => FILLER.test(text.trim());
