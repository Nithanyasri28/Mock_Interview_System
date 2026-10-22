import avaImg from '../assets/ava.png'
import alexImg from '../assets/alex.png'
import botImg from '../assets/careerpilot-bot.png'

// Display profiles for the interviewers. Voices are chosen from whatever the browser provides.
export const INTERVIEWERS = {
  ava: {
    id: 'ava',
    name: 'Ava',
    title: 'HR Interviewer',
    image: avaImg,
    accent: '#F472B6',
    pitch: 1.15,
    rate: 1,
    prefer: ['zira', 'samantha', 'heera', 'female'],
    fallbackIndex: 0,
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    title: 'Technical Interviewer',
    image: alexImg,
    accent: '#4FD1FF',
    pitch: 0.9,
    rate: 1,
    prefer: ['david', 'daniel', 'ravi', 'mark', 'george', 'male'],
    fallbackIndex: 1,
  },
  bot: {
    id: 'bot',
    name: 'CareerPilot AI',
    title: 'Virtual Interviewer',
    image: botImg,
    accent: '#7C83FF',
    pitch: 0.8,
    rate: 0.95,
    prefer: [],
    fallbackIndex: 2,
  },
}

export const INTERVIEWER_OPTIONS = [
  { value: 'auto', label: 'Rotate (Ava, Alex, CareerPilot AI)' },
  { value: 'ava', label: 'Ava only' },
  { value: 'alex', label: 'Alex only' },
  { value: 'bot', label: 'CareerPilot AI only' },
]

/** Same rotation as the original project: Ava opens, then Alex and CareerPilot AI alternate. */
export function interviewerForIndex(index, preference) {
  if (preference && INTERVIEWERS[preference]) return INTERVIEWERS[preference]
  if (index === 0) return INTERVIEWERS.ava
  return index % 2 === 0 ? INTERVIEWERS.alex : INTERVIEWERS.bot
}
