const fs = require('fs');
const _ = require('lodash');
const yahoo = require("./yahooFantasyBaseball");

function parseBench() {
    parsePosition('BN')
}

function parseQB() {
    parsePosition('QB')
}

function parseKickers() {
    parsePosition('K')
}

function parseDefense() {
    parsePosition('DEF')
}

function parseWideReceivers() {
    parsePositionWithFlex('WR')
}

function parseRunningBacks() {
    parsePositionWithFlex('RB')
}

function parseTightEnds() {
    parsePositionWithFlex('TE')
}

function parsePosition(position, json = null) {
    fs.readFile('./newData.json', 'utf8', (err, jsonString) => {
        if (err) {
            console.log("File read failed:", err)
            return
        }

        if (json === null) {
            json = JSON.parse(jsonString)
        }

        let teams = [];
        _.forEach(json, team => {
            let teamScore = 0;
            _.forEach(team.players, player => {
                if (player.position === position) {
                    teamScore += parseFloat(player.points);
                }
            })
            teams.push(
                {
                    Name: team.teamName,
                    Points: teamScore
                }
            )
        })
        console.dir(teams);
    })
}

function parsePositionWithFlex(position, json = null) {
    fs.readFile('./newData.json', 'utf8', (err, jsonString) => {
        if (err) {
            console.log("File read failed:", err)
            return
        }

        if (json === null) {
            json = JSON.parse(jsonString)
        }

        let teams = [];
        _.forEach(json, team => {
            let teamScore = 0;
            _.forEach(team.players, player => {
                if (player.position === position) {
                    teamScore += parseFloat(player.points);
                } else if (player.position === 'W/R/T' && player.primary_position === position) {
                    teamScore += parseFloat(player.points);
                }
            })
            teams.push(
                {
                    Name: team.teamName,
                    Points: teamScore
                }
            )
        })
        console.dir('==================' + position + '==================')
        console.dir(teams);
    })
}

function parseWRandRBPositionWithFlex(json) {
    parsePositionWithFlex('WR', json);
    parsePositionWithFlex('RB', json);
}

function getDataCleanupParseOutput() {
    getAllTeamsData().then(allData => parseAllData(allData)).then(data => parseWRandRBPositionWithFlex(data)).catch(err => console.dir(err));
}

const getAllTeamsData = async () => {
    try {
        // Read credentials file or get new authorization token
        await yahoo.yfbb.readCredentials();

        // If crededentials exist
        if (yahoo.yfbb.CREDENTIALS) {
            yahoo.yfbb.WEEK = await yahoo.yfbb.getCurrentWeek();
            console.dir('Week ' + yahoo.yfbb.WEEK)
            let teams = [];
            for (let i = 1; i <= yahoo.yfbb.NUMBER_OF_TEAMS; i++) {
                let team = await yahoo.yfbb.getCurrentRosterForTeam(i)
                teams.push(team);
            }
            // const currentRoster = await yahoo.yfbb.getCurrentRoster();

            return teams;
        }
    } catch (err) {
        console.error(`Error in getData(): ${err}`);
    }
};

const parseAllData = async (data) => {
    // console.dir(JSON.stringify(data));
    let leagueStats = [];
    let playerPointsStats = [];
    for (const team of data) {
        let teamStats = {};
        teamStats.teamName = team.name;
        teamStats.players = []

        let playersStringArr = [];
        for (let i = 0; i < team.roster.players.player.length; i++) {
            const player = team.roster.players.player[i];
            let aPlayer = {}
            // console.dir(player)
            aPlayer.key = player.player_key;
            aPlayer.primary_position = player.primary_position;
            aPlayer.position = player.selected_position ? player.selected_position.position : '';
            // console.dir(player.player_key)
            playersStringArr.push(player.player_key);

            teamStats.players.push(aPlayer)
        }
        let stats = await yahoo.yfbb.getPlayerStatsData(playersStringArr.join(','));
        let points = stats.fantasy_content.league.players//.player.player_points.total;
        playerPointsStats.push(points);

        leagueStats.push(teamStats)
    }

    // console.dir(JSON.stringify(playerPointsStats[0]))
    for (const team of leagueStats) {
        // console.dir(team)
        for (const teamPlayer of team.players) {
            for (const team of playerPointsStats) {
                for (const player of team.player) {
                    if (teamPlayer.key === player.player_key) {
                        teamPlayer.name = player.name.full;
                        teamPlayer.week = player.player_points.week;
                        teamPlayer.points = player.player_points.total;
                    }
                }
            }
        }
    }

    return leagueStats;
}

module.exports = getDataCleanupParseOutput();