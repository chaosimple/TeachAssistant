/**
 * 数据统计模块
 * 处理排行榜和频次图展示
 */
const StatisticsModule = {
    /**
     * 获取本周的周次
     * @returns {number|null} 当前周次
     */
    getCurrentWeek() {
        return SettingsModule.getCurrentWeek();
    },

    /**
     * 获取本周的学生统计数据
     * @returns {Array} 学生统计数据数组
     */
    getWeeklyStudentStats() {
        const students = StudentModule.getStudents();
        const records = AttendanceModule.getRecords();
        const currentWeek = this.getCurrentWeek();
        const stats = [];

        if (!currentWeek) return stats;

        // 筛选本周记录
        const weeklyRecords = records.filter(r => r.week === currentWeek);

        students.forEach(student => {
            const studentRecords = weeklyRecords.filter(r => r.studentId === student.id);
            if (studentRecords.length > 0) {
                const totalScore = studentRecords.reduce((sum, r) => sum + r.score, 0);
                const avgScore = Math.round(totalScore / studentRecords.length * 10) / 10;

                stats.push({
                    id: student.id,
                    name: student.name,
                    interactionCount: studentRecords.length,
                    avgScore: avgScore
                });
            }
        });

        // 按平均分降序排序
        stats.sort((a, b) => b.avgScore - a.avgScore);

        return stats;
    },

    /**
     * 获取本学期的学生统计数据
     * @returns {Array} 学生统计数据数组
     */
    getSemesterStudentStats() {
        const students = StudentModule.getStudents();
        const stats = [];

        students.forEach(student => {
            const studentStats = AttendanceModule.getStudentStats(student.id);
            if (studentStats.count > 0) {
                stats.push({
                    id: student.id,
                    name: student.name,
                    rollCount: student.rollCount || studentStats.count,
                    avgScore: studentStats.avgScore,
                    interactionCount: studentStats.count
                });
            }
        });

        // 按平均分降序排序
        stats.sort((a, b) => b.avgScore - a.avgScore);

        return stats;
    },

    /**
     * 渲染排行榜（通用方法）
     * @param {Array} stats - 统计数据
     * @param {string} containerId - 容器ID
     * @param {string} emptyTipId - 空提示ID
     */
    renderRanking(stats, containerId, emptyTipId) {
        const container = document.getElementById(containerId);
        const emptyTip = document.getElementById(emptyTipId);

        if (stats.length === 0) {
            container.innerHTML = '';
            emptyTip.style.display = 'block';
            return;
        }

        emptyTip.style.display = 'none';

        // 取前5名
        const top5 = stats.slice(0, 5);

        const html = top5.map((student, index) => {
            let medalClass = '';
            let medalContent = '';

            if (index === 0) {
                medalClass = 'gold';
            } else if (index === 1) {
                medalClass = 'silver';
            } else if (index === 2) {
                medalClass = 'bronze';
            } else if (index === 3) {
                medalClass = 'other medal-4';
                medalContent = '🎖️';
            } else {
                medalClass = 'other medal-5';
                medalContent = '⭐';
            }

            return `
                <div class="ranking-item rank-${index + 1}">
                    <div class="ranking-medal ${medalClass}">${medalContent}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${student.name}</div>
                        <div class="ranking-id">${student.id}</div>
                    </div>
                    <div class="ranking-score">
                        <div class="ranking-score-value">${student.avgScore}</div>
                        <div class="ranking-score-label">平均分</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * 渲染频次图（通用方法）
     * @param {Array} stats - 统计数据
     * @param {string} containerId - 容器ID
     * @param {string} emptyTipId - 空提示ID
     */
    renderChart(stats, containerId, emptyTipId) {
        const container = document.getElementById(containerId);
        const emptyTip = document.getElementById(emptyTipId);

        if (stats.length === 0) {
            container.innerHTML = '';
            emptyTip.style.display = 'block';
            return;
        }

        emptyTip.style.display = 'none';

        // 计算最大互动次数用于缩放
        const maxInteraction = Math.max(...stats.map(s => s.interactionCount), 1);

        // 按互动次数排序（降序）
        const sortedStats = [...stats].sort((a, b) => b.interactionCount - a.interactionCount);

        const html = sortedStats.map((student, index) => {
            const percentage = (student.interactionCount / maxInteraction) * 100;
            const rank = index + 1;

            return `
                <div class="chart-row">
                    <div class="chart-row-rank">${rank}</div>
                    <div class="chart-row-id">${student.id}</div>
                    <div class="chart-row-name">${student.name}</div>
                    <div class="chart-row-bars">
                        <div class="chart-bar-wrapper">
                            <div class="chart-bar-horizontal" style="width: ${percentage}%">
                            </div>
                        </div>
                        <div class="chart-row-value">${student.interactionCount}<span class="chart-row-unit">次</span></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * 渲染本周排行榜
     */
    renderWeeklyRanking() {
        const stats = this.getWeeklyStudentStats();
        this.renderRanking(stats, 'weeklyRankingList', 'emptyWeeklyRankingTip');
    },

    /**
     * 渲染本学期排行榜
     */
    renderSemesterRanking() {
        const stats = this.getSemesterStudentStats();
        this.renderRanking(stats, 'semesterRankingList', 'emptySemesterRankingTip');
    },

    /**
     * 渲染本周频次图
     */
    renderWeeklyChart() {
        const stats = this.getWeeklyStudentStats();
        this.renderChart(stats, 'weeklyChartBody', 'emptyWeeklyChartTip');
    },

    /**
     * 渲染本学期频次图
     */
    renderSemesterChart() {
        const stats = this.getSemesterStudentStats();
        this.renderChart(stats, 'semesterChartBody', 'emptySemesterChartTip');
    },

    /**
     * 渲染本周统计摘要
     */
    renderWeeklySummary() {
        const stats = this.getWeeklyStudentStats();
        const records = AttendanceModule.getRecords();
        const currentWeek = this.getCurrentWeek();

        // 本周互动次数
        const weeklyRecords = currentWeek ? records.filter(r => r.week === currentWeek) : [];
        document.getElementById('weeklyInteractions').textContent = weeklyRecords.length;

        // 本周平均分
        if (weeklyRecords.length > 0) {
            const totalScore = weeklyRecords.reduce((sum, r) => sum + r.score, 0);
            const avgScore = Math.round(totalScore / weeklyRecords.length * 10) / 10;
            document.getElementById('weeklyAvgScore').textContent = avgScore;

            // 本周最高分
            const highestScore = Math.max(...weeklyRecords.map(r => r.score));
            document.getElementById('weeklyHighestScore').textContent = highestScore;
        } else {
            document.getElementById('weeklyAvgScore').textContent = '0';
            document.getElementById('weeklyHighestScore').textContent = '0';
        }
    },

    /**
     * 渲染本学期统计摘要
     */
    renderSemesterSummary() {
        const students = StudentModule.getStudents();
        const records = AttendanceModule.getRecords();
        const stats = this.getSemesterStudentStats();

        // 学生总数
        document.getElementById('totalStudents').textContent = students.length;

        // 互动总次数
        document.getElementById('totalInteractions').textContent = records.length;

        // 全班平均分
        if (stats.length > 0) {
            const totalAvg = stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length;
            document.getElementById('avgScoreAll').textContent = totalAvg.toFixed(1);

            // 最高平均分
            document.getElementById('highestScore').textContent = stats[0].avgScore;
        } else {
            document.getElementById('avgScoreAll').textContent = '0';
            document.getElementById('highestScore').textContent = '0';
        }
    },

    /**
     * 刷新所有统计
     */
    refresh() {
        // 本周统计
        this.renderWeeklyRanking();
        this.renderWeeklyChart();
        this.renderWeeklySummary();

        // 本学期统计
        this.renderSemesterRanking();
        this.renderSemesterChart();
        this.renderSemesterSummary();
    },

    /**
     * 初始化
     */
    init() {
        // 初始化时不渲染，等待切换到统计页面时再渲染
    }
};