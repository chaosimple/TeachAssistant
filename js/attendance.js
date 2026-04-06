/**
 * 课堂互动模块
 * 处理随机点名和表现评分
 */
const AttendanceModule = {
    // 存储键名
    STORAGE_KEY: 'classroom_interaction',

    // 当前点名状态
    currentStudent: null,

    // 滚动动画相关
    rollInterval: null,
    isRolling: false,

    // 当前评分
    currentScore: 0,

    // 课堂点名状态
    classRollCall: {
        isActive: false,
        students: [],
        currentIndex: 0,
        absentList: []
    },

    /**
     * 获取所有互动记录
     * @returns {Array} 记录数组
     */
    getRecords() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * 保存记录
     * @param {Array} records - 记录数组
     */
    saveRecords(records) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
        // 标记数据已变更
        if (typeof markDataChanged === 'function') {
            markDataChanged();
        }
    },

    /**
     * 添加记录
     * @param {Object} record - 记录
     */
    addRecord(record) {
        const records = this.getRecords();
        records.push(record);
        this.saveRecords(records);
    },

    /**
     * 删除指定学生的所有记录
     * @param {string} studentId - 学号
     */
    deleteRecordsByStudent(studentId) {
        let records = this.getRecords();
        records = records.filter(r => r.studentId !== studentId);
        this.saveRecords(records);
    },

    /**
     * 清空所有记录
     */
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * 获取今日日期字符串（本地时间）
     * @returns {string} YYYY-MM-DD格式
     */
    getToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 获取当前时间字符串（本地时间）
     * @returns {string} HH:MM:SS格式
     */
    getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * 获取今日统计
     * @returns {Object} 统计数据
     */
    getTodayStats() {
        const records = this.getRecords();
        const today = this.getToday();
        const todayRecords = records.filter(r => r.date === today);

        const totalScore = todayRecords.reduce((sum, r) => sum + (r.score || 0), 0);
        const avgScore = todayRecords.length > 0 ? Math.round(totalScore / todayRecords.length) : 0;

        return {
            total: todayRecords.length,
            avgScore: avgScore
        };
    },

    /**
     * 获取学生互动统计
     * @param {string} studentId - 学号
     * @returns {Object} 统计数据
     */
    getStudentStats(studentId) {
        const records = this.getRecords();
        const studentRecords = records.filter(r => r.studentId === studentId);

        const totalScore = studentRecords.reduce((sum, r) => sum + (r.score || 0), 0);
        const avgScore = studentRecords.length > 0 ? Math.round(totalScore / studentRecords.length * 10) / 10 : 0;

        return {
            count: studentRecords.length,
            avgScore: avgScore
        };
    },

    /**
     * 权重随机选择算法
     * 基于历史记录，被点名次数少的学生有更高概率被选中
     * @returns {Object|null} 学生对象
     */
    weightedRandomSelect() {
        const students = StudentModule.getStudents();
        if (students.length === 0) return null;

        // 读取历史记录
        const records = this.getRecords();

        // 统计每个学生在历史记录中的点名次数
        const rollCountMap = {};
        records.forEach(record => {
            rollCountMap[record.studentId] = (rollCountMap[record.studentId] || 0) + 1;
        });

        // 获取最大点名次数
        const allCounts = students.map(s => rollCountMap[s.id] || 0);
        const maxRollCount = Math.max(...allCounts, 1);

        // 计算权重：从未被点名的学生权重最高
        const weightedStudents = students.map(student => {
            const historyCount = rollCountMap[student.id] || 0;
            return {
                ...student,
                weight: maxRollCount - historyCount + 1,
                historyCount: historyCount
            };
        });

        const totalWeight = weightedStudents.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;

        for (const student of weightedStudents) {
            random -= student.weight;
            if (random <= 0) {
                return student;
            }
        }

        return students[0];
    },

    /**
     * 执行随机点名（带滚动动画）
     */
    performRandomRoll() {
        const students = StudentModule.getStudents();

        if (students.length === 0) {
            showToast('请先添加学生', 'error');
            return;
        }

        if (this.isRolling) return;

        const finalStudent = this.weightedRandomSelect();
        this.startRollAnimation(students, finalStudent);
    },

    /**
     * 开始滚动动画
     * @param {Array} students - 学生数组
     * @param {Object} finalStudent - 最终选中的学生
     */
    startRollAnimation(students, finalStudent) {
        this.isRolling = true;
        const container = document.getElementById('rollcallScrollContent');
        const display = document.getElementById('rollcallDisplay');

        // 隐藏评分区域
        document.getElementById('rollcallRating').style.display = 'none';

        // 创建滚动内容
        let scrollItems = [];
        const itemCount = 25;

        for (let i = 0; i < itemCount; i++) {
            const student = students[i % students.length];
            scrollItems.push(student);
        }
        scrollItems.push(finalStudent);
        scrollItems.push(finalStudent);
        scrollItems.push(finalStudent);

        // 生成HTML
        container.innerHTML = scrollItems.map(s => `
            <div class="rollcall-scroll-item">
                <span class="student-id">${s.id}</span>
                <span class="student-name">${s.name}</span>
            </div>
        `).join('');

        // 开始动画
        display.classList.add('rolling');

        let currentSpeed = 50;
        let currentIndex = 0;
        const totalItems = scrollItems.length;

        const rollStep = () => {
            if (currentIndex >= totalItems - 1) {
                display.classList.remove('rolling');
                display.classList.add('rollcall-stopped');

                setTimeout(() => {
                    display.classList.remove('rollcall-stopped');
                }, 1000);

                this.isRolling = false;
                this.currentStudent = finalStudent;

                // 触发烟花彩带庆祝效果
                this.triggerCelebration();

                // 显示评分区域
                document.getElementById('rollcallRating').style.display = 'block';
                document.getElementById('currentStudent').textContent =
                    `${finalStudent.id} - ${finalStudent.name}`;

                // 重置星星评分
                this.resetStarRating();

                return;
            }

            currentIndex++;

            if (currentIndex > totalItems - 8) {
                currentSpeed += 25;
            } else if (currentIndex > totalItems - 4) {
                currentSpeed += 40;
            }

            container.style.transform = `translateY(-${currentIndex * 130}px)`;
            this.rollInterval = setTimeout(rollStep, currentSpeed);
        };

        this.rollInterval = setTimeout(rollStep, currentSpeed);
    },

    /**
     * 重置星星评分
     */
    resetStarRating() {
        this.currentScore = 0;
        document.getElementById('ratingScore').textContent = '0';
        document.querySelectorAll('#starRating .star').forEach(star => {
            star.classList.remove('active', 'half', 'hover', 'hover-half');
        });
    },

    /**
     * 触发烟花彩带庆祝效果
     */
    triggerCelebration() {
        // 检查是否启用动态点名效果
        if (!SettingsModule.isCelebrationEnabled()) {
            return;
        }

        const container = document.getElementById('celebrationContainer');
        if (!container) return;

        // 清空之前的庆祝效果
        container.innerHTML = '';

        // 创建光晕效果
        const glow = document.createElement('div');
        glow.className = 'celebration-glow';
        container.appendChild(glow);

        // 创建"恭喜选中"文字
        const text = document.createElement('div');
        text.className = 'celebration-text';
        text.textContent = '🎉 恭喜选中！';
        container.appendChild(text);

        // 创建烟花效果
        this.createFireworks(container);

        // 创建彩带效果
        this.createConfetti(container);

        // 创建星星闪烁
        this.createStars(container);

        // 2.5秒后清除效果
        setTimeout(() => {
            container.innerHTML = '';
        }, 2500);
    },

    /**
     * 创建烟花粒子
     * @param {HTMLElement} container - 容器元素
     */
    createFireworks(container) {
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcb', '#a66cff', '#ff922b'];
        const positions = [
            { x: 20, y: 30 }, { x: 50, y: 20 }, { x: 80, y: 30 },
            { x: 30, y: 60 }, { x: 70, y: 60 }, { x: 50, y: 50 }
        ];

        positions.forEach((pos, index) => {
            setTimeout(() => {
                for (let i = 0; i < 12; i++) {
                    const firework = document.createElement('div');
                    firework.className = 'firework';
                    firework.style.left = `${pos.x}%`;
                    firework.style.top = `${pos.y}%`;
                    firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

                    // 随机方向
                    const angle = (i / 12) * Math.PI * 2;
                    const distance = 30 + Math.random() * 40;
                    firework.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                    firework.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);

                    container.appendChild(firework);
                }
            }, index * 150);
        });
    },

    /**
     * 创建彩带效果
     * @param {HTMLElement} container - 容器元素
     */
    createConfetti(container) {
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcb', '#a66cff'];
        const shapes = ['confetti-rect', 'confetti-circle'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = '-20px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            confetti.style.animationDuration = `${1.5 + Math.random()}s`;

            // 随机形状
            if (Math.random() > 0.5) {
                confetti.style.borderRadius = '50%';
                confetti.style.width = '8px';
                confetti.style.height = '8px';
            }

            container.appendChild(confetti);
        }
    },

    /**
     * 创建星星闪烁效果
     * @param {HTMLElement} container - 容器元素
     */
    createStars(container) {
        const starEmojis = ['⭐', '✨', '🌟', '💫'];

        for (let i = 0; i < 8; i++) {
            const star = document.createElement('div');
            star.className = 'celebration-star';
            star.textContent = starEmojis[Math.floor(Math.random() * starEmojis.length)];
            star.style.left = `${10 + Math.random() * 80}%`;
            star.style.top = `${10 + Math.random() * 80}%`;
            star.style.animationDelay = `${Math.random() * 0.5}s`;

            container.appendChild(star);
        }
    },

    /**
     * 星星评分转换为分数 (0.5星 = 10分)
     * @param {number} stars - 星数 (0.5-5)
     * @returns {number} 分数 (0-100)
     */
    starsToScore(stars) {
        return Math.round(stars * 20);
    },

    /**
     * 分数转换为星数
     * @param {number} score - 分数 (0-100)
     * @returns {number} 星数 (0.5-5)
     */
    scoreToStars(score) {
        return score / 20;
    },

    /**
     * 初始化星星评分组件（支持半星）
     */
    initStarRating() {
        const starContainer = document.getElementById('starRating');
        const stars = starContainer.querySelectorAll('.star');

        stars.forEach((star, index) => {
            // 鼠标移动事件（检测左半还是右半）
            star.addEventListener('mousemove', (e) => {
                const rect = star.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const isLeftHalf = x < rect.width / 2;
                const starValue = index + 1;
                const hoverValue = isLeftHalf ? starValue - 0.5 : starValue;

                // 更新悬停效果
                stars.forEach((s, i) => {
                    s.classList.remove('hover', 'hover-half');
                    if (i < hoverValue) {
                        s.classList.add('hover');
                    } else if (i < starValue && hoverValue % 1 !== 0) {
                        // 半星效果
                        s.classList.add('hover-half');
                    }
                });

                // 当前星星的半星效果
                if (isLeftHalf) {
                    star.classList.remove('hover');
                    star.classList.add('hover-half');
                } else {
                    star.classList.remove('hover-half');
                    star.classList.add('hover');
                }

                // 显示预览分数
                const previewScore = this.starsToScore(hoverValue);
                document.getElementById('ratingScore').textContent = previewScore;
            });

            // 鼠标移出
            star.addEventListener('mouseleave', () => {
                stars.forEach(s => s.classList.remove('hover', 'hover-half'));
                // 恢复显示当前分数
                document.getElementById('ratingScore').textContent = this.currentScore;
            });

            // 点击选择
            star.addEventListener('click', (e) => {
                const rect = star.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const isLeftHalf = x < rect.width / 2;
                const starValue = index + 1;
                const selectedValue = isLeftHalf ? starValue - 0.5 : starValue;

                this.currentScore = this.starsToScore(selectedValue);

                // 更新显示
                document.getElementById('ratingScore').textContent = this.currentScore;

                // 更新星星状态
                stars.forEach((s, i) => {
                    s.classList.remove('active', 'half');
                    if (i < selectedValue) {
                        s.classList.add('active');
                    } else if (i < starValue && selectedValue % 1 !== 0) {
                        s.classList.add('half');
                    }
                });

                // 当前星星的状态
                if (isLeftHalf) {
                    star.classList.remove('active');
                    star.classList.add('half');
                } else {
                    star.classList.remove('half');
                    star.classList.add('active');
                }
            });
        });

        // 缺勤按钮
        document.getElementById('btnAbsent').addEventListener('click', () => {
            this.currentScore = 0;
            document.getElementById('ratingScore').textContent = 0;
            stars.forEach(s => s.classList.remove('active', 'half', 'hover', 'hover-half'));
        });

        // 请假按钮
        document.getElementById('btnLeave').addEventListener('click', () => {
            this.currentScore = 60;
            document.getElementById('ratingScore').textContent = 60;
            // 3颗星
            stars.forEach((s, i) => {
                s.classList.remove('half', 'hover', 'hover-half');
                if (i < 3) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    },

    /**
     * 确认评分
     */
    confirmRating() {
        if (!this.currentStudent) return;

        // 根据当前日期自动获取周数
        const currentWeek = SettingsModule.getCurrentWeek();
        if (!currentWeek) {
            showToast('请先在设置页面配置学期时间', 'error');
            return;
        }

        const score = this.currentScore;

        // 记录互动
        const record = {
            date: this.getToday(),
            time: this.getCurrentTime(),
            studentId: this.currentStudent.id,
            studentName: this.currentStudent.name,
            score: score,
            week: currentWeek
        };

        this.addRecord(record);

        // 更新学生互动次数
        StudentModule.updateRollCount(this.currentStudent.id);

        // 保存成绩到对应周数
        GradeModule.setWeekScore(this.currentStudent.id, currentWeek, score);

        showToast(`已记录：${this.currentStudent.name} - 第${currentWeek}周 - ${score}分`, 'success');

        // 重置状态
        this.currentStudent = null;
        document.getElementById('rollcallRating').style.display = 'none';

        // 刷新显示
        this.updateTodayDisplay();
        StudentModule.renderStudentList();
        GradeModule.renderGradeList();
    },

    /**
     * 跳过评分
     */
    skipRating() {
        if (!this.currentStudent) return;

        // 更新学生互动次数
        StudentModule.updateRollCount(this.currentStudent.id);

        // 重置状态
        this.currentStudent = null;
        document.getElementById('rollcallRating').style.display = 'none';

        // 刷新显示
        this.updateTodayDisplay();
        StudentModule.renderStudentList();
    },

    /**
     * 更新今日显示
     */
    updateTodayDisplay() {
        const stats = this.getTodayStats();

        document.getElementById('todayTotal').textContent = stats.total;
        document.getElementById('todayAvgScore').textContent = stats.avgScore;

        // 更新今日记录列表
        const records = this.getRecords();
        const today = this.getToday();
        const todayRecords = records.filter(r => r.date === today).reverse();

        const listHtml = todayRecords.map((r, index) => `
            <li data-index="${records.indexOf(r)}">
                <span class="record-info">
                    <span>${r.time.slice(0, 5)} ${r.studentName}</span>
                    <span class="score-badge">${r.score}分</span>
                </span>
                <div class="record-actions">
                    <button class="record-action-btn edit" title="修改评分" onclick="AttendanceModule.showEditModal(${records.indexOf(r)})">✏️</button>
                    <button class="record-action-btn delete" title="删除记录" onclick="AttendanceModule.deleteRecord(${records.indexOf(r)})">🗑️</button>
                </div>
            </li>
        `).join('');

        document.getElementById('todayList').innerHTML = listHtml || '<li style="text-align:center;color:var(--text-muted);">暂无记录</li>';
    },

    /**
     * 渲染历史记录
     * @param {string} filterDate - 筛选日期（可选）
     */
    renderHistory(filterDate = null) {
        const records = this.getRecords();
        const tbody = document.getElementById('historyList');

        let filteredRecords = records;
        if (filterDate) {
            filteredRecords = records.filter(r => r.date === filterDate);
        }

        filteredRecords.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });

        if (filteredRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">暂无记录</td></tr>';
            return;
        }

        tbody.innerHTML = filteredRecords.map(r => `
            <tr>
                <td>${r.date}</td>
                <td>${r.time}</td>
                <td>${r.studentId}</td>
                <td>${r.studentName}</td>
                <td><span class="score-badge">${r.score}分</span></td>
            </tr>
        `).join('');
    },

    // 当前编辑的记录索引
    currentEditIndex: null,

    /**
     * 显示编辑记录弹窗
     * @param {number} index - 记录索引
     */
    showEditModal(index) {
        const records = this.getRecords();
        const record = records[index];

        if (!record) {
            showToast('记录不存在', 'error');
            return;
        }

        this.currentEditIndex = index;

        // 填充弹窗信息
        document.getElementById('editRecordId').textContent = record.studentId;
        document.getElementById('editRecordName').textContent = record.studentName;
        document.getElementById('editRecordDate').textContent = record.date;
        document.getElementById('editRecordWeek').textContent = `第${record.week}周`;
        document.getElementById('editScoreInput').value = record.score;

        // 显示弹窗
        document.getElementById('editRecordModal').classList.add('active');
    },

    /**
     * 确认修改记录
     */
    confirmEditRecord() {
        if (this.currentEditIndex === null) return;

        const newScore = parseInt(document.getElementById('editScoreInput').value);

        if (isNaN(newScore) || newScore < 0 || newScore > 100) {
            showToast('请输入0-100之间的分数', 'error');
            return;
        }

        const records = this.getRecords();
        const record = records[this.currentEditIndex];

        if (!record) {
            showToast('记录不存在', 'error');
            return;
        }

        const oldScore = record.score;
        const studentId = record.studentId;
        const week = record.week;

        // 更新互动记录中的评分
        record.score = newScore;
        this.saveRecords(records);

        // 同步更新成绩管理中的成绩
        GradeModule.updateWeekScore(studentId, week, oldScore, newScore);

        // 关闭弹窗
        document.getElementById('editRecordModal').classList.remove('active');
        this.currentEditIndex = null;

        // 刷新显示
        this.updateTodayDisplay();
        this.renderHistory();
        GradeModule.renderGradeList();
        StudentModule.renderStudentList();

        showToast('评分已修改', 'success');
    },

    /**
     * 删除记录
     * @param {number} index - 记录索引
     */
    deleteRecord(index) {
        if (!confirm('确定要删除这条互动记录吗？删除后无法恢复。')) {
            return;
        }

        const records = this.getRecords();
        const record = records[index];

        if (!record) {
            showToast('记录不存在', 'error');
            return;
        }

        const studentId = record.studentId;
        const week = record.week;
        const score = record.score;

        // 从互动记录中删除
        records.splice(index, 1);
        this.saveRecords(records);

        // 同步从成绩管理中删除该周成绩
        GradeModule.removeWeekScore(studentId, week, score);

        // 更新学生互动次数
        StudentModule.decrementRollCount(studentId);

        // 刷新显示
        this.updateTodayDisplay();
        this.renderHistory();
        GradeModule.renderGradeList();
        StudentModule.renderStudentList();

        showToast('记录已删除', 'success');
    },

    /**
     * 初始化事件监听
     */
    init() {
        // 随机点名按钮
        document.getElementById('btnRandomRoll').addEventListener('click', () => {
            this.performRandomRoll();
        });

        // 课堂点名按钮
        document.getElementById('btnStartClassRoll').addEventListener('click', () => {
            this.startClassRollCall();
        });

        // 课堂点名 - 到场按钮
        document.getElementById('btnPresent').addEventListener('click', () => {
            this.markCurrentPresent();
        });

        // 课堂点名 - 缺席按钮
        document.getElementById('btnAbsent').addEventListener('click', () => {
            this.markCurrentAbsent();
        });

        // 课堂点名 - 上一位
        document.getElementById('btnPrevStudent').addEventListener('click', () => {
            this.prevStudent();
        });

        // 课堂点名 - 下一位
        document.getElementById('btnNextStudent').addEventListener('click', () => {
            this.nextStudent();
        });

        // 课堂点名 - 结束点名
        document.getElementById('btnFinishRollCall').addEventListener('click', () => {
            this.finishRollCall();
        });

        // 课堂点名 - 取消点名
        document.getElementById('btnCancelRollCall').addEventListener('click', () => {
            this.cancelRollCall();
        });

        // 初始化星星评分
        this.initStarRating();

        // 确认评分按钮
        document.getElementById('btnConfirmRating').addEventListener('click', () => {
            this.confirmRating();
        });

        // 跳过按钮
        document.getElementById('btnSkipRating').addEventListener('click', () => {
            this.skipRating();
        });

        // 历史记录日期筛选
        const historyDateInput = document.getElementById('historyDate');
        historyDateInput.addEventListener('change', (e) => {
            this.renderHistory(e.target.value || null);
        });

        historyDateInput.value = this.getToday();

        // 导出历史记录
        document.getElementById('btnExportHistory').addEventListener('click', () => {
            const filterDate = historyDateInput.value;
            const records = this.getRecords();
            const exportRecords = filterDate ? records.filter(r => r.date === filterDate) : records;

            if (exportRecords.length === 0) {
                showToast('没有可导出的记录', 'error');
                return;
            }

            const filename = filterDate ? `互动记录_${filterDate}.xlsx` : '互动记录_全部.xlsx';
            ExcelModule.exportHistory(exportRecords, filename);
            showToast('导出成功', 'success');
        });

        // 清空历史
        document.getElementById('btnClearHistory').addEventListener('click', () => {
            if (confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
                this.clearAll();
                const students = StudentModule.getStudents();
                students.forEach(s => s.rollCount = 0);
                StudentModule.saveStudents(students);
                StudentModule.renderStudentList();
                this.updateTodayDisplay();
                this.renderHistory();
                GradeModule.renderGradeList();
                showToast('历史记录已清空', 'success');
            }
        });

        // 初始显示
        this.updateTodayDisplay();
        this.renderHistory();

        // 初始化搜索功能
        this.initSearch();

        // 初始化编辑记录弹窗
        document.getElementById('btnConfirmEditRecord').addEventListener('click', () => {
            this.confirmEditRecord();
        });
    },

    /**
     * 简单拼音映射表
     */
    pinyinMap: {
        '赵': 'zhao', '钱': 'qian', '孙': 'sun', '李': 'li',
        '周': 'zhou', '吴': 'wu', '郑': 'zheng', '王': 'wang',
        '冯': 'feng', '陈': 'chen', '褚': 'chu', '卫': 'wei',
        '蒋': 'jiang', '沈': 'shen', '韩': 'han', '杨': 'yang',
        '朱': 'zhu', '秦': 'qin', '尤': 'you', '许': 'xu',
        '何': 'he', '吕': 'lv', '施': 'shi', '张': 'zhang',
        '孔': 'kong', '曹': 'cao', '严': 'yan', '华': 'hua',
        '金': 'jin', '魏': 'wei', '陶': 'tao', '姜': 'jiang',
        '戚': 'qi', '谢': 'xie', '邹': 'zou', '喻': 'yu',
        '柏': 'bai', '水': 'shui', '窦': 'dou', '章': 'zhang',
        '云': 'yun', '苏': 'su', '潘': 'pan', '葛': 'ge',
        '奚': 'xi', '范': 'fan', '彭': 'peng', '郎': 'lang',
        '鲁': 'lu', '韦': 'wei', '昌': 'chang', '马': 'ma',
        '苗': 'miao', '凤': 'feng', '花': 'hua', '方': 'fang',
        '俞': 'yu', '任': 'ren', '袁': 'yuan', '柳': 'liu',
        '酆': 'feng', '鲍': 'bao', '史': 'shi', '唐': 'tang',
        '费': 'fei', '廉': 'lian', '岑': 'cen', '薛': 'xue',
        '雷': 'lei', '贺': 'he', '倪': 'ni', '汤': 'tang',
        '滕': 'teng', '殷': 'yin', '罗': 'luo', '毕': 'bi',
        '郝': 'hao', '邬': 'wu', '安': 'an', '常': 'chang',
        '乐': 'le', '于': 'yu', '时': 'shi', '傅': 'fu',
        '皮': 'pi', '卞': 'bian', '齐': 'qi', '康': 'kang',
        '伍': 'wu', '余': 'yu', '元': 'yuan', '卜': 'bu',
        '顾': 'gu', '孟': 'meng', '平': 'ping', '黄': 'huang',
        '和': 'he', '穆': 'mu', '萧': 'xiao', '尹': 'yin',
        '姚': 'yao', '邵': 'shao', '湛': 'zhan', '汪': 'wang',
        '祁': 'qi', '毛': 'mao', '禹': 'yu', '狄': 'di',
        '米': 'mi', '贝': 'bei', '明': 'ming', '臧': 'zang',
        '计': 'ji', '伏': 'fu', '成': 'cheng', '戴': 'dai',
        '谈': 'tan', '宋': 'song', '茅': 'mao', '庞': 'pang',
        '熊': 'xiong', '纪': 'ji', '舒': 'shu', '屈': 'qu',
        '项': 'xiang', '祝': 'zhu', '董': 'dong', '梁': 'liang',
        '杜': 'du', '阮': 'ruan', '蓝': 'lan', '闵': 'min',
        '席': 'xi', '季': 'ji', '麻': 'ma', '强': 'qiang',
        '贾': 'jia', '路': 'lu', '娄': 'lou', '江': 'jiang',
        '童': 'tong', '颜': 'yan', '郭': 'guo', '梅': 'mei',
        '盛': 'sheng', '林': 'lin', '刁': 'diao', '钟': 'zhong',
        '徐': 'xu', '邱': 'qiu', '骆': 'luo', '高': 'gao',
        '夏': 'xia', '蔡': 'cai', '田': 'tian', '樊': 'fan',
        '胡': 'hu', '凌': 'ling', '霍': 'huo', '虞': 'yu',
        '万': 'wan', '支': 'zhi', '柯': 'ke', '昝': 'zan',
        '管': 'guan', '卢': 'lu', '莫': 'mo', '经': 'jing',
        '房': 'fang', '裘': 'qiu', '缪': 'miao', '干': 'gan',
        '解': 'xie', '应': 'ying', '宗': 'zong', '丁': 'ding',
        '宣': 'xuan', '贲': 'ben', '邓': 'deng', '郁': 'yu',
        '单': 'shan', '杭': 'hang', '洪': 'hong', '包': 'bao',
        '诸': 'zhu', '左': 'zuo', '石': 'shi', '崔': 'cui',
        '吉': 'ji', '钮': 'niu', '龚': 'gong', '程': 'cheng',
        '嵇': 'ji', '邢': 'xing', '滑': 'hua', '裴': 'pei',
        '陆': 'lu', '荣': 'rong', '翁': 'weng', '荀': 'xun',
        '羊': 'yang', '甄': 'zhen', '家': 'jia', '封': 'feng',
        '芮': 'rui', '羿': 'yi', '储': 'chu', '靳': 'jin',
        '汲': 'ji', '邴': 'bing', '糜': 'mi', '松': 'song',
        '井': 'jing', '段': 'duan', '富': 'fu', '巫': 'wu',
        '乌': 'wu', '焦': 'jiao', '巴': 'ba', '弓': 'gong',
        '牧': 'mu', '隗': 'wei', '山': 'shan', '谷': 'gu',
        '车': 'che', '侯': 'hou', '宓': 'mi', '蓬': 'peng',
        '全': 'quan', '郗': 'xi', '班': 'ban', '仰': 'yang',
        '秋': 'qiu', '仲': 'zhong', '伊': 'yi', '宫': 'gong',
        '宁': 'ning', '仇': 'qiu', '栾': 'luan', '暴': 'bao',
        '甘': 'gan', '钭': 'tou', '厉': 'li', '戎': 'rong',
        '祖': 'zu', '武': 'wu', '符': 'fu', '刘': 'liu',
        '景': 'jing', '詹': 'zhan', '束': 'shu', '龙': 'long',
        '叶': 'ye', '幸': 'xing', '司': 'si', '韶': 'shao',
        '郜': 'gao', '黎': 'li', '蓟': 'ji', '薄': 'bo',
        '印': 'yin', '宿': 'su', '白': 'bai', '怀': 'huai',
        '蒲': 'pu', '台': 'tai', '丛': 'cong', '鄂': 'e',
        '索': 'suo', '咸': 'xian', '籍': 'ji', '赖': 'lai',
        '卓': 'zhuo', '蔺': 'lin', '屠': 'tu', '蒙': 'meng',
        '池': 'chi', '乔': 'qiao', '阴': 'yin', '鬱': 'yu',
        '胥': 'xu', '能': 'neng', '苍': 'cang', '双': 'shuang',
        '闻': 'wen', '莘': 'shen', '党': 'dang', '翟': 'zhai',
        '谭': 'tan', '贡': 'gong', '劳': 'lao', '逄': 'pang',
        '姬': 'ji', '申': 'shen', '扶': 'fu', '堵': 'du',
        '冉': 'ran', '宰': 'zai', '郦': 'li', '雍': 'yong',
        '却': 'que', '璩': 'qu', '桑': 'sang', '桂': 'gui',
        '濮': 'pu', '牛': 'niu', '寿': 'shou', '通': 'tong',
        '边': 'bian', '扈': 'hu', '燕': 'yan', '冀': 'ji',
        '郏': 'jia', '浦': 'pu', '尚': 'shang', '农': 'nong',
        '温': 'wen', '别': 'bie', '庄': 'zhuang', '晏': 'yan',
        '柴': 'chai', '瞿': 'qu', '阎': 'yan', '充': 'chong',
        '慕': 'mu', '连': 'lian', '茹': 'ru', '习': 'xi',
        '宦': 'huan', '艾': 'ai', '鱼': 'yu', '容': 'rong',
        '向': 'xiang', '古': 'gu', '易': 'yi', '慎': 'shen',
        '戈': 'ge', '廖': 'liao', '庾': 'yu', '终': 'zhong',
        '暨': 'ji', '居': 'ju', '衡': 'heng', '步': 'bu',
        '都': 'du', '耿': 'geng', '满': 'man', '弘': 'hong',
        '匡': 'kuang', '国': 'guo', '文': 'wen', '寇': 'kou',
        '广': 'guang', '禄': 'lu', '阙': 'que', '东': 'dong',
        '欧': 'ou', '殳': 'shu', '沃': 'wo', '利': 'li',
        '蔚': 'wei', '越': 'yue', '夔': 'kui', '隆': 'long',
        '师': 'shi', '巩': 'gong', '厍': 'she', '聂': 'nie',
        '晁': 'chao', '勾': 'gou', '敖': 'ao', '融': 'rong',
        '冷': 'leng', '訾': 'zi', '辛': 'xin', '阚': 'kan',
        '那': 'na', '简': 'jian', '饶': 'rao', '空': 'kong',
        '曾': 'zeng', '母': 'mu', '沙': 'sha', '乜': 'nie',
        '养': 'yang', '鞠': 'ju', '须': 'xu', '丰': 'feng',
        '巢': 'chao', '关': 'guan', '蒯': 'kuai', '相': 'xiang',
        '查': 'zha', '後': 'hou', '荆': 'jing', '红': 'hong',
        '游': 'you', '竺': 'zhu', '权': 'quan', '逯': 'lu',
        '盖': 'ge', '益': 'yi', '桓': 'huan', '公': 'gong',
        '万': 'wan', '俟': 'qi', '司马': 'sima', '上官': 'shangguan',
        '欧阳': 'ouyang', '夏侯': 'xiahou', '诸葛': 'zhuge', '闻人': 'wenren',
        '东方': 'dongfang', '赫连': 'helian', '皇甫': 'huangfu', '尉迟': 'yuchi',
        '公羊': 'gongyang', '澹台': 'tantai', '公冶': 'gongye', '宗政': 'zongzheng',
        '濮阳': 'puyang', '淳于': 'chunyu', '单于': 'chanyu', '太叔': 'taishu',
        '申屠': 'shentu', '公孙': 'gongsun', '仲孙': 'zhongsun', '轩辕': 'xuanyuan',
        '令狐': 'linghu', '钟离': 'zhongli', '宇文': 'yuwen', '长孙': 'zhangsun',
        '慕容': 'murong', '鲜于': 'xianyu', '闾丘': 'lvqiu', '司徒': 'situ',
        '司空': 'sikong', '亓官': 'qiguan', '司寇': 'sikou', '仉': 'zhang',
        '督': 'du', '子车': 'ziche', '颛孙': 'zhuansun', '端木': 'duanmu',
        '巫马': 'wuma', '公西': 'gongxi', '漆雕': 'qidiao', '乐正': 'yuezheng',
        '壤驷': 'rangsi', '公良': 'gongliang', '拓跋': 'tuoba', '夹谷': 'jiagu',
        '宰父': 'zaifu', '谷梁': 'guliang', '晋': 'jin', '楚': 'chu',
        '闫': 'yan', '法': 'fa', '汝': 'ru', '鄢': 'yan',
        '涂': 'tu', '钦': 'qin', '段干': 'duangan', '百里': 'baili',
        '东郭': 'dongguo', '南门': 'nanmen', '呼延': 'huyan', '归海': 'guihai',
        '羊舌': 'yangshe', '微生': 'weisheng', '岳': 'yue', '帅': 'shuai',
        '缑': 'gou', '亢': 'kang', '况': 'kuang', '后': 'hou',
        '有': 'you', '琴': 'qin', '梁丘': 'liangqiu', '左丘': 'zuoqiu',
        '东门': 'dongmen', '西门': 'ximen', '商': 'shang', '牟': 'mou',
        '佘': 'she', '佴': 'er', '伯': 'bo', '赏': 'shang',
        '墨': 'mo', '哈': 'ha', '谯': 'qiao', '笪': 'da',
        '年': 'nian', '爱': 'ai', '阳': 'yang', '佟': 'tong',
        '第': 'di', '五': 'wu', '言': 'yan', '福': 'fu'
    },

    /**
     * 获取汉字的拼音
     * @param {string} char - 单个汉字
     * @returns {string} 拼音
     */
    getPinyin(char) {
        return this.pinyinMap[char] || '';
    },

    /**
     * 获取字符串的拼音首字母
     * @param {string} str - 字符串
     * @returns {string} 拼音首字母
     */
    getPinyinInitials(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const pinyin = this.getPinyin(str[i]);
            if (pinyin) {
                result += pinyin[0];
            }
        }
        return result;
    },

    /**
     * 获取字符串的完整拼音
     * @param {string} str - 字符串
     * @returns {string} 完整拼音
     */
    getFullPinyin(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const pinyin = this.getPinyin(str[i]);
            result += pinyin || str[i];
        }
        return result;
    },

    /**
     * 搜索学生
     * @param {string} keyword - 搜索关键词
     * @returns {Array} 匹配的学生数组
     */
    searchStudents(keyword) {
        if (!keyword || keyword.trim() === '') return [];

        const students = StudentModule.getStudents();
        const kw = keyword.trim().toLowerCase();

        return students.filter(student => {
            const id = student.id.toLowerCase();
            const name = student.name;

            // 学号完全匹配
            if (id === kw) return true;

            // 学号部分匹配
            if (id.includes(kw)) return true;

            // 姓名完全匹配
            if (name.includes(keyword.trim())) return true;

            // 拼音首字母匹配
            const initials = this.getPinyinInitials(name).toLowerCase();
            if (initials.includes(kw)) return true;

            // 完整拼音匹配
            const fullPinyin = this.getFullPinyin(name).toLowerCase();
            if (fullPinyin.includes(kw)) return true;

            return false;
        });
    },

    /**
     * 显示搜索结果
     */
    showSearchResults() {
        const keyword = document.getElementById('searchInput').value;
        const resultsDiv = document.getElementById('searchResults');

        if (!keyword || keyword.trim() === '') {
            resultsDiv.style.display = 'none';
            return;
        }

        const results = this.searchStudents(keyword);

        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="search-no-result">未找到匹配的学生</div>';
            resultsDiv.style.display = 'block';
            return;
        }

        const html = results.map(student => `
            <div class="search-result-item" onclick="AttendanceModule.selectStudent('${student.id}')">
                <span class="result-name">${student.name}</span>
                <span class="result-id">${student.id}</span>
            </div>
        `).join('');

        resultsDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
    },

    /**
     * 选择学生进行评分
     * @param {string} studentId - 学号
     */
    selectStudent(studentId) {
        const students = StudentModule.getStudents();
        const student = students.find(s => s.id === studentId);

        if (!student) {
            showToast('未找到该学生', 'error');
            return;
        }

        this.currentStudent = student;

        // 隐藏搜索结果
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('searchInput').value = '';

        // 更新显示区域 - 重新构建只包含当前学生的HTML
        const container = document.getElementById('rollcallScrollContent');
        container.innerHTML = `
            <div class="rollcall-scroll-item">
                <span class="student-id">${student.id}</span>
                <span class="student-name">${student.name}</span>
            </div>
        `;
        // 重置滚动位置
        container.style.transform = 'translateY(0)';

        // 触发烟花彩带庆祝效果
        this.triggerCelebration();

        // 显示评分区域
        document.getElementById('rollcallRating').style.display = 'block';
        document.getElementById('currentStudent').textContent = `${student.id} - ${student.name}`;

        // 重置星星评分
        this.resetStarRating();
    },

    /**
     * 初始化搜索功能
     */
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('btnSearch');
        const searchResults = document.getElementById('searchResults');

        // 点击搜索按钮
        searchBtn.addEventListener('click', () => {
            this.showSearchResults();
        });

        // 输入时实时搜索
        searchInput.addEventListener('input', () => {
            this.showSearchResults();
        });

        // 回车搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.showSearchResults();
            }
        });

        // 点击其他地方隐藏搜索结果
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-section')) {
                searchResults.style.display = 'none';
            }
        });
    },

    // ========== 课堂点名功能 ==========

    /**
     * 开始课堂点名
     */
    startClassRollCall() {
        const students = StudentModule.getStudents();

        if (students.length === 0) {
            showToast('请先添加学生', 'error');
            return;
        }

        // 初始化课堂点名状态
        this.classRollCall = {
            isActive: true,
            students: students,  // 按导入顺序
            currentIndex: 0,
            absentList: []
        };

        // 隐藏随机点名区域，显示课堂点名面板
        document.getElementById('rollcallDisplay').style.display = 'none';
        document.getElementById('rollcallActions').style.display = 'none';
        document.getElementById('searchSection') && (document.getElementById('searchSection').style.display = 'none');
        document.getElementById('rollcallRating').style.display = 'none';
        document.getElementById('classrollPanel').style.display = 'block';

        // 渲染第一个学生
        this.renderCurrentStudent();
    },

    /**
     * 渲染当前学生
     */
    renderCurrentStudent() {
        const { students, currentIndex, absentList } = this.classRollCall;

        if (currentIndex >= students.length) {
            // 所有学生都已点完
            document.getElementById('classrollCurrentName').textContent = '点名完成！';
            document.getElementById('classrollCurrentId').textContent = '';
            document.getElementById('classrollProgress').textContent = `共 ${students.length} 名学生`;
            return;
        }

        const student = students[currentIndex];
        document.getElementById('classrollCurrentName').textContent = student.name;
        document.getElementById('classrollCurrentId').textContent = student.id;
        document.getElementById('classrollProgress').textContent = `第 ${currentIndex + 1}/${students.length} 名学生`;

        // 更新缺席列表显示
        this.renderAbsentList();
    },

    /**
     * 渲染缺席列表
     */
    renderAbsentList() {
        const absentList = this.classRollCall.absentList;
        const listElement = document.getElementById('absentList');

        if (absentList.length === 0) {
            listElement.innerHTML = '<li style="color: rgba(255,255,255,0.7);">暂无</li>';
            return;
        }

        listElement.innerHTML = absentList.map(s =>
            `<li>${s.studentId} - ${s.studentName}</li>`
        ).join('');
    },

    /**
     * 标记当前学生到场
     */
    markCurrentPresent() {
        const { students, currentIndex } = this.classRollCall;

        if (currentIndex >= students.length) return;

        // 移动到下一个学生
        this.classRollCall.currentIndex++;
        this.renderCurrentStudent();
    },

    /**
     * 标记当前学生缺席
     */
    markCurrentAbsent() {
        const { students, currentIndex } = this.classRollCall;

        if (currentIndex >= students.length) return;

        const student = students[currentIndex];

        // 添加到缺席列表
        this.classRollCall.absentList.push({
            studentId: student.id,
            studentName: student.name
        });

        // 立即保存记录到历史
        const currentWeek = SettingsModule.getCurrentWeek() || 1;
        const record = {
            date: this.getToday(),
            time: this.getCurrentTime(),
            studentId: student.id,
            studentName: student.name,
            score: 0,
            week: currentWeek,
            type: 'rollcall'
        };
        this.addRecord(record);

        // 更新学生互动次数
        StudentModule.updateRollCount(student.id);

        // 保存成绩到对应周数
        GradeModule.setWeekScore(student.id, currentWeek, 0);

        // 立即刷新今日显示
        this.updateTodayDisplay();
        StudentModule.renderStudentList();
        GradeModule.renderGradeList();

        // 移动到下一个学生
        this.classRollCall.currentIndex++;
        this.renderCurrentStudent();
    },

    /**
     * 上一位学生
     */
    prevStudent() {
        const { currentIndex } = this.classRollCall;

        if (currentIndex > 0) {
            this.classRollCall.currentIndex--;
            this.renderCurrentStudent();
        } else {
            showToast('已经是第一个学生', 'error');
        }
    },

    /**
     * 下一位学生
     */
    nextStudent() {
        const { students, currentIndex } = this.classRollCall;

        if (currentIndex < students.length) {
            this.classRollCall.currentIndex++;
            this.renderCurrentStudent();
        } else {
            showToast('已经是最后一个学生', 'error');
        }
    },

    /**
     * 结束课堂点名
     */
    finishRollCall() {
        const { absentList } = this.classRollCall;

        if (absentList.length === 0) {
            showToast('本次点名没有缺席学生', 'success');
            this.closeClassRollCall();
            return;
        }

        // 获取当前周数
        const currentWeek = SettingsModule.getCurrentWeek();
        if (!currentWeek) {
            showToast('请先在设置页面配置学期时间', 'error');
            return;
        }

        const today = this.getToday();
        const time = this.getCurrentTime();

        // 为每个缺席学生添加记录
        absentList.forEach(student => {
            const record = {
                date: today,
                time: time,
                studentId: student.studentId,
                studentName: student.studentName,
                score: 0,
                week: currentWeek,
                type: 'rollcall'
            };
            this.addRecord(record);

            // 更新学生互动次数
            StudentModule.updateRollCount(student.studentId);

            // 保存成绩到对应周数
            GradeModule.setWeekScore(student.studentId, currentWeek, 0);
        });

        showToast(`已记录 ${absentList.length} 名缺席学生`, 'success');

        // 刷新显示
        this.updateTodayDisplay();
        StudentModule.renderStudentList();
        GradeModule.renderGradeList();

        this.closeClassRollCall();
    },

    /**
     * 取消课堂点名
     */
    cancelRollCall() {
        if (this.classRollCall.absentList.length > 0) {
            if (!confirm('取消将丢失已标记的缺席记录，确定要取消吗？')) {
                return;
            }
        }
        this.closeClassRollCall();
    },

    /**
     * 关闭课堂点名面板
     */
    closeClassRollCall() {
        // 重置状态
        this.classRollCall = {
            isActive: false,
            students: [],
            currentIndex: 0,
            absentList: []
        };

        // 恢复显示随机点名区域
        document.getElementById('rollcallDisplay').style.display = 'block';
        document.getElementById('rollcallActions').style.display = 'flex';
        document.getElementById('searchSection') && (document.getElementById('searchSection').style.display = 'block');
        document.getElementById('classrollPanel').style.display = 'none';
    }
};