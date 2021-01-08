<template lang="pug">
.app-body
  v-app
    v-tabs(v-model="activeTab", dark)
      v-tab(ripple) 設定
      v-tab(ripple) 各局統計
      v-tab(ripple) 整篇統計
      v-tab-item
        .card-content
          v-form(v-model="formValid")
            v-btn-toggle(cass="mb-5", v-model="gameType")
              v-btn(value="1") 默契
              v-btn(value="2") 巧連字
            br
            v-text-field(
              v-model="author",
              v-if="gameType === '1'"
              label="湯主",
              :rules="requiredRule",
              reqired
            )
            v-text-field(
              v-model="startText",
              v-if="gameType === '1'"
              label="開始回合文字(部分文字即可)",
              :rules="requiredRule",
              reqired
            )
            v-text-field(
              v-model="endText",
              v-if="gameType === '1'"
              :rules="requiredRule",
              label="結束回合文字(部分文字即可)",
              reqired
            )
            v-text-field(
              v-if="gameType === '2'"
              v-model="recomputeInterval",
              type="number",
              :rules="requiredRule",
              label="自動重整間隔(秒)",
              reqired
            )
            v-text-field(
              v-if="gameType === '2'"
              v-model="answers",
              :rules="requiredRule",
              label="答案，請以,隔開",
              reqired
            )
          div
            v-btn(@click="save") 儲存表單
            v-btn(@click="autoUpdate" v-if="!recompute") 自動統計
            v-btn(@click="stopAutoUpdate" v-if="recompute") 暫停自動統計
            v-btn(color="success", :disabled="!formValid", @click="getDOM") 統計
      v-tab-item
        .card-content
          v-data-table(
            :headers="roundResultHeaders",
            :items="scoreOfEachRound",
            :pagination.sync="roundResultPagination"
          )
            template(slot="items", slot-scope="props")
              td {{ props.item.round }}
              td {{ props.item.answer }}
              td {{ props.item.score }}
              td {{ props.item.players }}
      v-tab-item
        .card-content
          v-data-table(
            :headers="resultHeaders",
            :items="resultData",
            :pagination.sync="resultPagination"
          )
            template(slot="items", slot-scope="props")
              td {{ props.item.player }}
              td {{ props.item.score }}
</template>

<script>

const STORAGE_KEY = 'TURTLE_HELPER_'

export default {
  data() {
    return {
      gameType: '1', // 1: 默契 2:推文接龍
      author: "zhibb",
      startText: "你會想到什麼",
      endText: "答題結束",
      activeTab: 0,
      answers: '答案1,答案2',
      recompute: false,
      recomputeInterval: 3,
      recomputeIntervalHandler: null,
      formValid: false,
      requiredRule: [(v) => !!v || "此為必填"],
      scoreOfEachRound: [],
      roundResultHeaders: [
        { text: "回合數", value: "round" },
        { text: "答案", value: "answer" },
        { text: "分數", value: "score" },
        { text: "玩家", value: "players" },
      ],
      roundResultPagination: {
        sortBy: "round",
        descending: true,
      },
      roundsPlayerScore: {}, //分數總計
      resultData: [],
      resultHeaders: [
        { text: "玩家", value: "player" },
        { text: "分數", value: "score" },
      ],
      resultPagination: {
        sortBy: "score",
        descending: true,
      }
    };
  },
  mounted: function() {
    this.load()
  },
  methods: {
    clearInterval() {
      if (this.recomputeIntervalHandler) {
        clearInterval(this.recomputeIntervalHandler)
      }
    },
    autoUpdate() {
      this.clearInterval()
      this.recompute = true
      this.getDOM();
      this.recomputeIntervalHandler = setInterval(() => {
        this.getDOM();
      }, this.recomputeInterval * 1000)
    },
    stopAutoUpdate() {
      this.recompute = false
      this.clearInterval()
    },
    tab() {
      chrome.tabs.create({ url: "pages/app.html" });
    },
    save() {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gameType: this.gameType,
        author: this.author,
        startText: this.startText,
        endText: this.endText,
        answers: this.answers,
        recomputeInterval: this.recomputeInterval,
      }))
    },
    load() {
      const storedData = window.localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        this.gameType = data.gameType;
        this.author = data.author;
        this.startText = data.startText;
        this.endText = data.endText;
        this.answers = data.answers;
        this.recomputeInterval = data.recomputeInterval;
      }
    },
    summarizeGameType1(pushes) {
      const author = this.author;

      let rounds = [];
      let pushesInRound = [];
      let scores = {};

      // chat, play
      let mode = "chat";
      pushes.forEach((push) => {
        if (mode === "chat") {
          if (push.author === author && push.content.includes(this.startText)) {
            mode = "play";
            pushesInRound = [];
          }
        }
        if (mode === "play") {
          if (push.author === author && push.content.includes(this.endText)) {
            mode = "chat";
            rounds.push(pushesInRound);
          } else {
            pushesInRound.push(push);
          }
        }
      });

      this.roundsPlayerScore = {};

      rounds.forEach((round, roundIndex) => {
        let roundAnswerCount = {};
        let players = [];
        let roundPlayerScore = {};
        round.forEach((push) => {
          if (!players.includes(push.author)) {
            // replacing : and spaces
            let content = push.content.replace(":", "").replace(" ", "");
            if (!roundAnswerCount.hasOwnProperty(content)) {
              roundAnswerCount[content] = [push.author];
            } else {
              roundAnswerCount[content].push(push.author);
            }
          }
        });

        let scoreArrayOfThisRound = [];
        for (let answer in roundAnswerCount) {
          if (roundAnswerCount.hasOwnProperty(answer)) {
            if (roundAnswerCount[answer].length > 1) {
              const score = roundAnswerCount[answer].length;
              this.scoreOfEachRound.push({
                round: roundIndex + 1,
                answer: answer,
                score: score,
                players: roundAnswerCount[answer].join(", "),
              });
              roundAnswerCount[answer].forEach((player) => {
                const score = roundAnswerCount[answer].length;
                // add to rounds score
                if (!this.roundsPlayerScore.hasOwnProperty(player)) {
                  this.roundsPlayerScore[player] = score;
                } else {
                  this.roundsPlayerScore[player] += score;
                }
              });
            }
          }
        }
      }); // end of all rounds

      // round score object to array
      this.resultData = [];
      for (let player in this.roundsPlayerScore) {
        if (this.roundsPlayerScore.hasOwnProperty(player)) {
          this.resultData.push({
            player: player,
            score: this.roundsPlayerScore[player],
          });
        }
      }
      this.activeTab = 1;
    },
    summarizeGameType2(pushes) {
      const author = this.author;

      let rounds = [];
      let pushesInRound = [];
      let scores = {};

        
      const answers = this.answers.split(',')
      this.roundsPlayerScore = {};
      let roundIndex = 0;
      let answerOfRound = answers[roundIndex]
      let answerCharacters = answerOfRound.split('')
      pushes.forEach((push, pushIndex) => {
        if (answerOfRound === undefined) return;

        let content = push.content.replace(":", "").replace(" ", "");
        let author = push.author
      
        if (content === answerCharacters[0]) {
          const players = [author]
          let allMatch = true;
          for (let i = 1; i < answerCharacters.length; i++) {
            if ( pushes[pushIndex + i] ) {
              let content = pushes[pushIndex + i].content.replace(":", "").replace(" ", "");
              let author = pushes[pushIndex + i].author
              players.push(author)
              if (content !== answerCharacters[i]) {
                allMatch = false
              }
            } else {
              let allMatch = false;
              break;
            }
          }
          // check completed, check if it matches
          if (allMatch) {
            this.scoreOfEachRound.push({
              round: roundIndex + 1,
              answer: answerOfRound,
              score: 1,
              players: players.join(", "),
            })
            
            players.forEach(player => {
              if (!this.roundsPlayerScore.hasOwnProperty(player)) {
                this.roundsPlayerScore[player] = 1;
              } else {
                  this.roundsPlayerScore[player] += 1;
              }
            })

            roundIndex++;
            answerOfRound = answers[roundIndex]
            answerCharacters = answerOfRound?.split('')
          }
        }

      });


      // round score object to array
      this.resultData = [];
      for (let player in this.roundsPlayerScore) {
        if (this.roundsPlayerScore.hasOwnProperty(player)) {
          this.resultData.push({
            player: player,
            score: this.roundsPlayerScore[player],
          });
        }
      }
      if (!this.recompute) {
        this.activeTab = 1;
      }

    },
    getDOM() {
      //We have permission to access the activeTab, so we can call chrome.tabs.executeScript:
      chrome.tabs.executeScript(
        {
          code: "(" + getDOM + ")();", //argument here is a string but function.toString() returns function's code
        },
        (results) => {
          const author = this.author;
          this.scoreOfEachRound = [];

          let content = $($.parseHTML(results[0]));

          let pushes = content
            .find(".push")
            .toArray()
            .map((p) => {
              const j_p = $(p);
              return {
                author: j_p.find(".push-userid").text(),
                content: j_p.find(".push-content").text(),
              };
            });
          
          if (this.gameType === '1') this.summarizeGameType1(pushes)
          else this.summarizeGameType2(pushes)
        }
      );
    },
  },
};
function getDOM() {
  return document.body.innerHTML;
}
</script>

<style lang="scss" scoped>
.app-body {
  min-width: 500px;
}
.card-content {
  padding: 15px;
}
.mb-5 {
  margin-bottom: 5px;
}
</style>
