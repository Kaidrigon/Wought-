import { corporateJokes } from "./corporate";
import { developerJokes } from "./developer";
import { internetJokes } from "./internet";
import { streamingJokes } from "./streaming";
import { productivityJokes } from "./productivity";
import { eventGAG } from "./events"
import { sleepGAG } from "./sleep";
import { moviesGAG } from "./movies";

export const movieJokes =[
    ...moviesGAG
]

export const sleepJokes =[
    ...sleepGAG
];


export const eventJokes =[
    ...eventGAG
];

export const returningJokes =[
    ...productivityJokes
];

export const firstVisitJokes = [

    ...corporateJokes,

    ...developerJokes,

    ...internetJokes,

    ...streamingJokes,

];