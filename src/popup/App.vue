<template lang="pug">
div(class="app-body")
  v-app
    v-tabs(
      v-model="activeTab"
      dark
    )
      v-tab(ripple) 設定
      v-tab(ripple) 各局統計
      v-tab(ripple) 整篇統計
      v-tab-item
        div(class="card-content")
          v-form(
            v-model="formValid"
            )
            v-text-field(
              v-model="author"
              label="湯主"
              :rules="requiredRule"
              reqired
            )
            v-text-field(
              v-model="startText"
              label="開始回合文字(部分文字即可)"
              :rules="requiredRule"
              reqired
            )
            v-text-field(
              v-model="endText"
              :rules="requiredRule"
              label="結束回合文字(部分文字即可)"
              reqired
            )
          div
            v-btn(color="success" :disabled="!formValid" @click="getDOM") 統計
      v-tab-item
        div(class="card-content")
          v-data-table(
            :headers="roundResultHeaders"
            :items="scoreOfEachRound"
            :pagination.sync="roundResultPagination"
          )
            template(slot="items" slot-scope="props")
              td {{ props.item.round }}
              td {{ props.item.answer }}
              td {{ props.item.score }}
              td {{ props.item.players }}
      v-tab-item
        div(class="card-content")
          v-data-table(
            :headers="resultHeaders"
            :items="resultData"
            :pagination.sync="resultPagination"
          )
            template(slot="items" slot-scope="props")
              td {{ props.item.player }}
              td {{ props.item.score }}
</template>

<script>
export default {
  data() {
    return {
      author: "zhibb",
      startText: "你會想到什麼",
      endText: "答題結束",
      activeTab: 0,
      formValid: false,
      requiredRule: [v => !!v || "此為必填"],
      scoreOfEachRound: [],
      roundResultHeaders: [
        { text: "回合數", value: "round" },
        { text: "答案", value: "answer" },
        { text: "分數", value: "score" },
        { text: "玩家", value: "players" }
      ],
      roundResultPagination: {
        sortBy: "round",
        descending: true
      },
      roundsPlayerScore: {}, //分數總計
      resultData: [],
      resultHeaders: [
        { text: "玩家", value: "player" },
        { text: "分數", value: "score" }
      ],
      resultPagination: {
        sortBy: "score",
        descending: true
      }
    };
  },
  methods: {
    tab() {
      chrome.tabs.create({ url: "pages/app.html" });
    },
    getDOM() {
      //We have permission to access the activeTab, so we can call chrome.tabs.executeScript:
      chrome.tabs.executeScript(
        {
          code: "(" + getDOM + ")();" //argument here is a string but function.toString() returns function's code
        },
        results => {
          const author = this.author;
          this.scoreOfEachRound = [];

          let content = $($.parseHTML(results[0]));

          let pushes = content
            .find(".push")
            .toArray()
            .map(p => {
              const j_p = $(p);
              return {
                author: j_p.find(".push-userid").text(),
                content: j_p.find(".push-content").text()
              };
            });

          let rounds = [];
          let pushesInRound = [];
          let scores = {};

          let counter = 1;
          // chat, play
          let mode = "chat";
          pushes.forEach(push => {
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
            round.forEach(push => {
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

            let scoreArrayOfThisRound = []
            for (let answer in roundAnswerCount) {
              if (roundAnswerCount.hasOwnProperty(answer)) {
                if (roundAnswerCount[answer].length > 1) {
                  const score = roundAnswerCount[answer].length;
                  this.scoreOfEachRound.push({
                    round: roundIndex + 1,
                    answer: answer,
                    score: score,
                    players: roundAnswerCount[answer].join(', ')
                  })
                  roundAnswerCount[answer].forEach(player => {
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
                score: this.roundsPlayerScore[player]
              })
            }
          }
          this.activeTab = 1
        }
      )
    }
  }
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
</style>
