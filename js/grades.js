/**
 * 成绩管理模块
 * 处理课堂表现成绩录入和统计
 */
const GradeModule = {
    // 存储键名
    STORAGE_KEY: 'classroom_grades',

    // 当前编辑状态
    currentEditStudent: null,
    currentEditWeek: null,
    currentModalScore: 0,

    /**
     * 获取所有成绩数据
     * @returns {Object} 以学号为键的成绩对象
     */
    getGrades() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    },

    /**
     * 保存成绩数据
     * @param {Object} grades - 成绩对象
     */
    saveGrades(grades) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(grades));
        // 标记数据已变更
        if (typeof markDataChanged === 'function') {
            markDataChanged();
        }
    },

    /**
     * 获取学生所有周的成绩
     * @param {string} studentId - 学号
     * @returns {Object} 包含成绩的对象
     */
    getStudentGrades(studentId) {
        const grades = this.getGrades();
        return grades[studentId] || {};
    },

    /**
     * 设置学生某周的表现成绩
     * @param {string} studentId - 学号
     * @param {number} week - 周次
     * @param {number} score - 评分(0-100)
     */
    setWeekScore(studentId, week, score) {
        const grades = this.getGrades();
        if (!grades[studentId]) {
            grades[studentId] = {};
        }
        grades[studentId][week] = Math.max(0, Math.min(100, score));
        this.saveGrades(grades);
    },

    /**
     * 更新学生某周的表现成绩（用于编辑互动记录时同步更新）
     * @param {string} studentId - 学号
     * @param {number} week - 周次
     * @param {number} oldScore - 原分数
     * @param {number} newScore - 新分数
     */
    updateWeekScore(studentId, week, oldScore, newScore) {
        const grades = this.getGrades();
        if (!grades[studentId]) {
            grades[studentId] = {};
        }
        // 检查该周的成绩是否与原成绩匹配
        if (grades[studentId][week] === oldScore) {
            grades[studentId][week] = newScore;
        } else {
            // 如果不匹配，可能是多次互动，需要重新计算该周的平均分
            // 这里简单处理：直接更新为新分数
            grades[studentId][week] = newScore;
        }
        this.saveGrades(grades);
    },

    /**
     * 移除学生某周的成绩（用于删除互动记录时同步更新）
     * @param {string} studentId - 学号
     * @param {number} week - 周次
     * @param {number} score - 要移除的分数
     */
    removeWeekScore(studentId, week, score) {
        const grades = this.getGrades();
        if (grades[studentId] && grades[studentId][week] !== undefined) {
            // 检查该周的成绩是否与要移除的分数匹配
            if (grades[studentId][week] === score) {
                delete grades[studentId][week];
                // 如果该学生没有成绩了，删除整个学生记录
                if (Object.keys(grades[studentId]).length === 0) {
                    delete grades[studentId];
                }
                this.saveGrades(grades);
            }
        }
    },

    /**
     * 获取学生某周的成绩
     * @param {string} studentId - 学号
     * @param {number} week - 周次
     * @returns {number|null} 成绩
     */
    getWeekScore(studentId, week) {
        const grades = this.getGrades();
        return grades[studentId] ? grades[studentId][week] : null;
    },

    /**
     * 计算学生平均成绩
     * @param {string} studentId - 学号
     * @returns {number} 平均分
     */
    calculateAverage(studentId) {
        const studentGrades = this.getStudentGrades(studentId);
        const scores = Object.values(studentGrades).filter(s => s !== null && s !== undefined);

        if (scores.length === 0) return 0;

        const sum = scores.reduce((a, b) => a + b, 0);
        return Math.round(sum / scores.length * 10) / 10;
    },

    /**
     * 获取学生被评分次数
     * @param {string} studentId - 学号
     * @returns {number}
     */
    getScoreCount(studentId) {
        const studentGrades = this.getStudentGrades(studentId);
        return Object.values(studentGrades).filter(s => s !== null && s !== undefined).length;
    },

    /**
     * 删除学生成绩
     * @param {string} studentId - 学号
     */
    deleteGradeByStudent(studentId) {
        const grades = this.getGrades();
        delete grades[studentId];
        this.saveGrades(grades);
    },

    /**
     * 清空所有成绩
     */
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * 渲染成绩列表（动态周数）
     */
    renderGradeList() {
        const students = StudentModule.getStudents();
        const tbody = document.getElementById('gradeList');
        const thead = document.getElementById('gradeTableHead');
        const grades = this.getGrades();

        // 获取当前总周数
        const totalWeeks = SettingsModule.getTotalWeeks();
        const semesterInfo = SettingsModule.getSemesterInfo();

        // 更新标题
        const titleEl = document.getElementById('gradesTitle');
        if (semesterInfo.isActive) {
            titleEl.textContent = `成绩管理 - 第${semesterInfo.currentWeek}周 / 共${totalWeeks}周`;
        } else if (semesterInfo.start) {
            titleEl.textContent = '成绩管理 - 学期未开始';
        } else {
            titleEl.textContent = '成绩管理 - 请先设置学期时间';
        }

        // 生成表头
        let headerHtml = '<tr><th>编号</th><th>学号</th><th>姓名</th>';
        for (let w = 1; w <= totalWeeks; w++) {
            headerHtml += `<th>W${w}</th>`;
        }
        headerHtml += '<th>平均分</th></tr>';
        thead.innerHTML = headerHtml;

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${totalWeeks + 5}" style="text-align:center;color:var(--text-muted);">暂无学生数据</td></tr>`;
            return;
        }

        tbody.innerHTML = students.map((student, index) => {
            const studentGrades = grades[student.id] || {};
            const avgScore = this.calculateAverage(student.id);
            const scoreCount = this.getScoreCount(student.id);

            // 生成周单元格
            let weekCells = '';
            for (let w = 1; w <= totalWeeks; w++) {
                const score = studentGrades[w];
                const hasScore = score !== null && score !== undefined;
                const cellClass = hasScore ? 'has-score' : '';
                const cellContent = hasScore ? score : '-';

                weekCells += `
                    <td class="${cellClass}" onclick="GradeModule.editWeekScore('${student.id}', ${w}, ${score || 'null'})">
                        ${cellContent}
                    </td>
                `;
            }

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student.id}</td>
                    <td>${student.name}</td>
                    ${weekCells}
                    <td class="avg-score">
                        <strong>${avgScore}</strong>
                        <small>(${scoreCount}次)</small>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * 编辑某周成绩
     * @param {string} studentId - 学号
     * @param {number} week - 周次
     * @param {number|null} currentScore - 当前成绩
     */
    editWeekScore(studentId, week, currentScore) {
        const students = StudentModule.getStudents();
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        this.currentEditStudent = studentId;
        this.currentEditWeek = week;
        this.currentModalScore = currentScore || 0;

        document.getElementById('gradeStudentName').textContent =
            `学生：${student.name}（${studentId}）- 第${week}周`;

        // 设置星星状态
        this.updateModalStars(currentScore || 0);
        document.getElementById('modalRatingScore').textContent = currentScore || 0;

        document.getElementById('gradeModal').classList.add('active');
    },

    /**
     * 更新弹窗星星状态
     * @param {number} score - 分数
     */
    updateModalStars(score) {
        const stars = document.querySelectorAll('#modalStarRating .star');
        const starValue = score / 20;

        stars.forEach((star, index) => {
            const value = parseFloat(star.dataset.value);
            if (value <= starValue) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    },

    /**
     * 初始化弹窗星星评分组件
     */
    initModalStarRating() {
        const starContainer = document.getElementById('modalStarRating');
        const stars = starContainer.querySelectorAll('.star');

        stars.forEach((star, index) => {
            // 鼠标移动事件
            star.addEventListener('mousemove', (e) => {
                const rect = star.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const isLeftHalf = x < rect.width / 2;
                const starValue = index + 1;
                const hoverValue = isLeftHalf ? starValue - 0.5 : starValue;

                stars.forEach((s, i) => {
                    s.classList.remove('hover', 'hover-half');
                    if (i < hoverValue) {
                        s.classList.add('hover');
                    }
                });

                if (isLeftHalf) {
                    star.classList.remove('hover');
                    star.classList.add('hover-half');
                } else {
                    star.classList.remove('hover-half');
                    star.classList.add('hover');
                }

                const previewScore = Math.round(hoverValue * 20);
                document.getElementById('modalRatingScore').textContent = previewScore;
            });

            // 鼠标移出
            star.addEventListener('mouseleave', () => {
                stars.forEach(s => s.classList.remove('hover', 'hover-half'));
                document.getElementById('modalRatingScore').textContent = this.currentModalScore;
            });

            // 点击选择
            star.addEventListener('click', (e) => {
                const rect = star.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const isLeftHalf = x < rect.width / 2;
                const starValue = index + 1;
                const selectedValue = isLeftHalf ? starValue - 0.5 : starValue;

                this.currentModalScore = Math.round(selectedValue * 20);
                document.getElementById('modalRatingScore').textContent = this.currentModalScore;

                stars.forEach((s, i) => {
                    s.classList.remove('active', 'half');
                    if (i < selectedValue) {
                        s.classList.add('active');
                    }
                });

                if (isLeftHalf) {
                    star.classList.remove('active');
                    star.classList.add('half');
                } else {
                    star.classList.remove('half');
                    star.classList.add('active');
                }
            });
        });
    },

    /**
     * 确认成绩
     */
    confirmGrade() {
        const score = this.currentModalScore;
        const week = this.currentEditWeek;
        const studentId = this.currentEditStudent;

        if (score === 0) {
            showToast('请选择评分', 'error');
            return;
        }

        if (studentId) {
            this.setWeekScore(studentId, week, score);
            this.renderGradeList();
            document.getElementById('gradeModal').classList.remove('active');
            showToast('成绩已保存', 'success');
        }

        this.currentEditStudent = null;
        this.currentEditWeek = null;
        this.currentModalScore = 0;
    },

    /**
     * 获取全部成绩数据（用于导出）
     * @returns {Array} 成绩数据数组
     */
    getAllGradesData() {
        const students = StudentModule.getStudents();
        const grades = this.getGrades();
        const totalWeeks = SettingsModule.getTotalWeeks();

        return students.map(student => {
            const studentGrades = grades[student.id] || {};
            const avgScore = this.calculateAverage(student.id);
            const scoreCount = this.getScoreCount(student.id);

            const row = {
                id: student.id,
                name: student.name,
                scores: {},
                avgScore: avgScore,
                scoreCount: scoreCount
            };

            for (let w = 1; w <= totalWeeks; w++) {
                row.scores[w] = studentGrades[w] !== undefined ? studentGrades[w] : '';
            }

            return row;
        });
    },

    /**
     * 初始化事件监听
     */
    init() {
        this.initModalStarRating();

        document.getElementById('btnConfirmGrade').addEventListener('click', () => {
            this.confirmGrade();
        });

        document.getElementById('btnExportGrades').addEventListener('click', () => {
            const data = this.getAllGradesData();
            if (data.length === 0) {
                showToast('没有可导出的数据', 'error');
                return;
            }
            this.exportGradesExcel(data);
            showToast('成绩导出成功', 'success');
        });

        this.renderGradeList();
    },

    /**
     * 导出成绩Excel
     * @param {Array} data - 成绩数据
     */
    exportGradesExcel(data) {
        const totalWeeks = SettingsModule.getTotalWeeks();
        const header = ['学号', '姓名'];
        for (let i = 1; i <= totalWeeks; i++) {
            header.push(`第${i}周`);
        }
        header.push('平均分', '评分次数');

        const rows = [header];

        data.forEach(item => {
            const row = [item.id, item.name];
            for (let w = 1; w <= totalWeeks; w++) {
                row.push(item.scores[w]);
            }
            row.push(item.avgScore, item.scoreCount);
            rows.push(row);
        });

        ExcelModule.downloadExcel(rows, '课堂表现成绩表.xlsx');
    }
};