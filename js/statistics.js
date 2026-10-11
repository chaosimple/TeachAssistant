/**
 * 数据统计模块
 * 处理排行榜和频次图展示
 */
const StatisticsModule = {
    // 排序状态存储
    sortState: {
        weekly: { field: 'count', order: 'desc' },
        semester: { field: 'id', order: 'asc' }
    },

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
     * 获取本学期的学生统计数据（显示所有学生，按学号排序）
     * @returns {Array} 学生统计数据数组
     */
    getSemesterStudentStats() {
        const students = StudentModule.getStudents();
        const stats = [];

        students.forEach(student => {
            const studentStats = AttendanceModule.getStudentStats(student.id);
            stats.push({
                id: student.id,
                name: student.name,
                rollCount: student.rollCount || studentStats.count,
                avgScore: studentStats.count > 0 ? studentStats.avgScore : 0,
                interactionCount: studentStats.count // 没有数据时为0
            });
        });

        // 按学号排序（字符串比较）
        stats.sort((a, b) => a.id.localeCompare(b.id, 'zh-CN'));

        return stats;
    },

    /**
     * 排序频次图
     * @param {string} type - 'weekly' 或 'semester'
     * @param {string} field - 排序字段: 'rank', 'id', 'name', 'count'
     */
    sortChart(type, field) {
        const currentState = this.sortState[type];

        // 切换排序方向：如果点击同一字段，则切换方向
        if (currentState.field === field) {
            currentState.order = currentState.order === 'asc' ? 'desc' : 'asc';
        } else {
            // 切换字段时，设置默认方向
            currentState.field = field;
            // 编号、学号、姓名默认升序，互动次数默认降序
            currentState.order = (field === 'count') ? 'desc' : 'asc';
        }

        // 更新表头样式
        this.updateSortButtons(type, field, currentState.order);

        // 重新渲染图表
        if (type === 'weekly') {
            this.renderWeeklyChart();
        } else {
            this.renderSemesterChart();
        }
    },

    /**
     * 更新排序按钮样式
     * @param {string} type - 'weekly' 或 'semester'
     * @param {string} activeField - 当前排序字段
     * @param {string} order - 排序方向
     */
    updateSortButtons(type, activeField, order) {
        const containerId = type === 'weekly' ? 'weeklyChartContainer' : 'semesterChartContainer';
        const container = document.getElementById(containerId);

        // 移除所有活动状态
        container.querySelectorAll('.sortable').forEach(el => {
            el.classList.remove('sort-asc-active', 'sort-desc-active');
            el.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        });

        // 设置当前排序字段的活动状态
        const activeHeader = container.querySelector(`[data-sort="${activeField}"]`);
        if (activeHeader) {
            activeHeader.classList.add(order === 'asc' ? 'sort-asc-active' : 'sort-desc-active');
            const btnClass = order === 'asc' ? '.sort-asc' : '.sort-desc';
            const activeBtn = activeHeader.querySelector(btnClass);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }
    },

    /**
     * 根据当前排序状态排序数据
     * @param {Array} stats - 统计数据
     * @param {string} type - 'weekly' 或 'semester'
     * @returns {Array} 排序后的数据
     */
    sortStats(stats, type) {
        const { field, order } = this.sortState[type];
        const multiplier = order === 'asc' ? 1 : -1;

        const sortedStats = [...stats].sort((a, b) => {
            let comparison = 0;

            switch (field) {
                case 'id':
                    comparison = a.id.localeCompare(b.id, 'zh-CN');
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'zh-CN');
                    break;
                case 'count':
                    comparison = a.interactionCount - b.interactionCount;
                    break;
                case 'rank':
                default:
                    // 按原始顺序（学号排序）
                    comparison = a.id.localeCompare(b.id, 'zh-CN');
                    break;
            }

            return comparison * multiplier;
        });

        return sortedStats;
    },

    /**
     * 获取本学期王冠排行榜数据（仅统计获得过王冠的学生）
     * @returns {Array} [{id, name, crownCount, interactionCount, avgScore}]，按王冠数降序、学号升序
     */
    getCrownRanking() {
        const students = StudentModule.getStudents();
        const records = AttendanceModule.getRecords();
        const stats = [];

        students.forEach(student => {
            const studentRecords = records.filter(r => r.studentId === student.id);
            const crownCount = studentRecords.filter(r => r.crown).length;
            if (crownCount > 0) {
                const totalScore = studentRecords.reduce((sum, r) => sum + (r.score || 0), 0);
                stats.push({
                    id: student.id,
                    name: student.name,
                    crownCount: crownCount,
                    interactionCount: studentRecords.length,
                    avgScore: Math.round(totalScore / studentRecords.length * 10) / 10
                });
            }
        });

        // 王冠数降序，数量相同时按学号升序
        stats.sort((a, b) => {
            if (b.crownCount !== a.crownCount) return b.crownCount - a.crownCount;
            return a.id.localeCompare(b.id, 'zh-CN');
        });

        return stats;
    },

    /**
     * 渲染名次奖牌（默认的排行榜左侧标记）
     * @param {number} index - 名次下标（从0开始）
     * @returns {string} 奖牌HTML
     */
    renderMedal(index) {
        if (index === 0) return '<div class="ranking-medal gold"></div>';
        if (index === 1) return '<div class="ranking-medal silver"></div>';
        if (index === 2) return '<div class="ranking-medal bronze"></div>';
        if (index === 3) return '<div class="ranking-medal other medal-4">🎖️</div>';
        return '<div class="ranking-medal other medal-5">⭐</div>';
    },

    /**
     * 渲染王冠标记（王冠榜不用奖牌也不用数字，直接画出王冠数量）
     * @param {number} count - 王冠数量
     * @returns {string} 王冠HTML
     */
    renderCrownBadge(count) {
        const crowns = '👑'.repeat(Math.max(0, count));
        return `<div class="ranking-crowns" title="${count}个王冠">${crowns}</div>`;
    },

    /**
     * 渲染排行榜（通用方法）
     * @param {Array} stats - 统计数据
     * @param {string} containerId - 容器ID
     * @param {string} emptyTipId - 空提示ID
     * @param {Object} [options] - 配置项
     * @param {string} [options.valueKey] - 取值的字段名，默认 'avgScore'
     * @param {string} [options.label] - 取值下方的说明文字，默认 '平均分'
     * @param {Function} [options.badge] - 自定义左侧标记，(student, index) => HTML，默认按名次显示奖牌
     * @param {string} [options.badgePosition] - 标记位置：'start'（默认，在姓名左侧）或 'end'（在姓名右侧，且不显示分数）
     */
    renderRanking(stats, containerId, emptyTipId, { valueKey = 'avgScore', label = '平均分', badge, badgePosition = 'start' } = {}) {
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
            const badgeHtml = typeof badge === 'function'
                ? badge(student, index)
                : this.renderMedal(index);

            const infoHtml = `
                    <div class="ranking-info">
                        <div class="ranking-name">${student.name}</div>
                        <div class="ranking-id">${student.id}</div>
                    </div>`;

            // 标记在右侧的榜单不显示分数，标记本身就是取值
            if (badgePosition === 'end') {
                return `
                <div class="ranking-item rank-${index + 1}">
                    ${infoHtml}
                    ${badgeHtml}
                </div>
            `;
            }

            return `
                <div class="ranking-item rank-${index + 1}">
                    ${badgeHtml}
                    ${infoHtml}
                    <div class="ranking-score">
                        <div class="ranking-score-value">${student[valueKey]}</div>
                        <div class="ranking-score-label">${label}</div>
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
     * @param {string} type - 'weekly' 或 'semester'，用于确定排序状态
     */
    renderChart(stats, containerId, emptyTipId, type = 'weekly') {
        const container = document.getElementById(containerId);
        const emptyTip = document.getElementById(emptyTipId);

        if (stats.length === 0) {
            container.innerHTML = '';
            emptyTip.style.display = 'block';
            return;
        }

        emptyTip.style.display = 'none';

        // 根据排序状态排序数据
        const sortedStats = this.sortStats(stats, type);

        // 计算最大互动次数用于缩放（至少为1，避免没有数据时除零）
        const maxInteraction = Math.max(...sortedStats.map(s => s.interactionCount), 1);

        const html = sortedStats.map((student, index) => {
            const percentage = maxInteraction > 0 ? (student.interactionCount / maxInteraction) * 100 : 0;
            const displayRank = index + 1;

            return `
                <div class="chart-row">
                    <div class="chart-row-rank">${displayRank}</div>
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

        // 更新排序按钮状态
        const containerParent = container.parentElement;
        const sortType = containerId.includes('weekly') ? 'weekly' : 'semester';
        this.updateSortButtons(sortType, this.sortState[sortType].field, this.sortState[sortType].order);
    },

    /**
     * 渲染本周排行榜
     */
    renderWeeklyRanking() {
        const stats = this.getWeeklyStudentStats();
        this.renderRanking(stats, 'weeklyRankingList', 'emptyWeeklyRankingTip');
    },

    /**
     * 渲染本学期排行榜（按平均分降序取TOP5）
     */
    renderSemesterRanking() {
        const stats = this.getSemesterStudentStats();
        // 按平均分降序排序后取TOP5
        const sortedStats = [...stats].sort((a, b) => b.avgScore - a.avgScore);
        this.renderRanking(sortedStats, 'semesterRankingList', 'emptySemesterRankingTip');
    },

    /**
     * 渲染本学期王冠排行榜（按王冠数降序取TOP5，王冠直接画在姓名右侧）
     */
    renderCrownRanking() {
        const stats = this.getCrownRanking();
        this.renderRanking(stats, 'crownRankingList', 'emptyCrownRankingTip', {
            badge: (student) => this.renderCrownBadge(student.crownCount),
            badgePosition: 'end'
        });
    },

    /**
     * 获取所有封神记录（按时间倒序，最新的在前）
     * @returns {Array} 带有 crown 标记的互动记录
     */
    getCrownRecords() {
        return AttendanceModule.getRecords()
            .filter(r => r.crown)
            .sort((a, b) => {
                const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
                if (dateCompare !== 0) return dateCompare;
                const timeCompare = String(b.time || '').localeCompare(String(a.time || ''));
                if (timeCompare !== 0) return timeCompare;
                return 0;
            });
    },

    /**
     * 转义文本，避免封神理由里的特殊字符破坏页面结构
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    /**
     * 渲染「王冠学生」弹窗内容（列出每一条封神记录：什么时间、因为什么理由）
     */
    renderCrownStudentsModal() {
        const records = this.getCrownRecords();
        const tbody = document.getElementById('crownStudentsList');
        const emptyTip = document.getElementById('emptyCrownStudentsTip');

        if (records.length === 0) {
            tbody.innerHTML = '';
            emptyTip.style.display = 'block';
            return;
        }

        emptyTip.style.display = 'none';

        tbody.innerHTML = records.map(record => `
            <tr>
                <td>${record.date} ${record.time}</td>
                <td>${record.studentId}</td>
                <td>${record.studentName}</td>
                <td class="crown-reason">${this.escapeHtml(record.crownReason) || '-'}</td>
            </tr>
        `).join('');
    },

    /**
     * 打开「王冠学生」弹窗
     */
    showCrownStudentsModal() {
        this.renderCrownStudentsModal();
        document.getElementById('crownStudentsModal').classList.add('active');
    },

    /**
     * 渲染本周频次图
     */
    renderWeeklyChart() {
        const stats = this.getWeeklyStudentStats();
        this.renderChart(stats, 'weeklyChartBody', 'emptyWeeklyChartTip', 'weekly');
    },

    /**
     * 渲染本学期频次图
     */
    renderSemesterChart() {
        const stats = this.getSemesterStudentStats();
        this.renderChart(stats, 'semesterChartBody', 'emptySemesterChartTip', 'semester');
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

            // 本周最低分
            const lowestScore = Math.min(...weeklyRecords.map(r => r.score));
            document.getElementById('weeklyLowestScore').textContent = lowestScore;
        } else {
            document.getElementById('weeklyAvgScore').textContent = '0';
            document.getElementById('weeklyHighestScore').textContent = '0';
            document.getElementById('weeklyLowestScore').textContent = '0';
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

        // 获得过王冠的学生数
        document.getElementById('crownedStudents').textContent = this.getCrownRanking().length;

        // 互动总次数
        document.getElementById('totalInteractions').textContent = records.length;

        // 全班平均分
        if (stats.length > 0) {
            const totalAvg = stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length;
            document.getElementById('avgScoreAll').textContent = totalAvg.toFixed(1);

            // 最高平均分（取所有学生中的最高平均分）
            const highestAvgScore = Math.max(...stats.map(s => s.avgScore));
            document.getElementById('highestScore').textContent = highestAvgScore;
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
        this.renderCrownRanking();
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