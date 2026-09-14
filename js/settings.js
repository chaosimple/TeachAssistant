/**
 * 设置模块
 * 处理学期时间设置和周数计算
 */
const SettingsModule = {
    // 存储键名
    STORAGE_KEY: 'classroom_settings',

    /**
     * 解析 YYYY-MM-DD 格式的日期为本地时间（避免时区偏移问题）
     * JavaScript 的 new Date("YYYY-MM-DD") 会按 UTC 解析，在中国时区会偏移 8 小时
     * @param {string} dateStr - 日期字符串
     * @returns {Date|null} 本地时间的 Date 对象
     */
    parseLocalDate(dateStr) {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    },

    /**
     * 获取设置数据
     * @returns {Object} 设置对象
     */
    getSettings() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        const defaultSettings = {
            courseName: '',
            semesterStart: null,
            semesterEnd: null,
            enableCelebration: true // 默认启用动态点名效果
        };
        return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    },

    /**
     * 保存设置数据
     * @param {Object} settings - 设置对象
     */
    saveSettings(settings) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
        // 标记数据已变更
        if (typeof markDataChanged === 'function') {
            markDataChanged();
        }
    },

    /**
     * 获取课程名称
     * @returns {string} 课程名称
     */
    getCourseName() {
        const settings = this.getSettings();
        return settings.courseName || '';
    },

    /**
     * 检查是否启用动态点名效果
     * @returns {boolean} 是否启用
     */
    isCelebrationEnabled() {
        const settings = this.getSettings();
        return settings.enableCelebration !== false; // 默认为true
    },

    /**
     * 获取当前日期（本地时间）
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
     * 计算当前周数
     * @returns {number|null} 当前周数（1-16），如果未设置学期则返回null
     */
    getCurrentWeek() {
        const settings = this.getSettings();
        if (!settings.semesterStart) return null;

        const startDate = this.parseLocalDate(settings.semesterStart);
        const today = this.parseLocalDate(this.getToday());

        // 计算天数差
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // 计算周数（从第1周开始）
        if (diffDays < 0) return null; // 学期未开始

        const week = Math.floor(diffDays / 7) + 1;
        return week;
    },

    /**
     * 获取已过去的总周数（用于成绩表格显示）
     * @returns {number} 总周数
     */
    getTotalWeeks() {
        const settings = this.getSettings();
        if (!settings.semesterStart) return 0;

        const startDate = this.parseLocalDate(settings.semesterStart);
        const today = this.parseLocalDate(this.getToday());

        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 0;

        return Math.floor(diffDays / 7) + 1;
    },

    /**
     * 获取学期信息
     * @returns {Object} 学期信息
     */
    getSemesterInfo() {
        const settings = this.getSettings();
        const currentWeek = this.getCurrentWeek();
        const totalWeeks = this.getTotalWeeks();

        return {
            start: settings.semesterStart,
            end: settings.semesterEnd,
            currentWeek: currentWeek,
            totalWeeks: totalWeeks,
            isActive: settings.semesterStart && currentWeek !== null
        };
    },

    /**
     * 更新头部显示
     */
    updateHeaderDisplay() {
        const week = this.getCurrentWeek();
        const settings = this.getSettings();
        const courseName = settings.courseName || '';

        // 更新标题显示
        const titleEl = document.querySelector('.header-title h1');
        if (titleEl) {
            titleEl.textContent = courseName ? `${courseName}课程互动系统` : '课堂互动系统';
        }

        // 格式化日期显示（使用当前本地时间，避免时区问题）
        const now = new Date();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const formattedDate = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;

        document.getElementById('headerDate').textContent = formattedDate;

        if (week !== null) {
            document.getElementById('headerWeek').textContent = `第${week}周`;
        } else if (settings.semesterStart) {
            // 学期已设置但未开始
            document.getElementById('headerWeek').textContent = '学期未开始';
        } else {
            document.getElementById('headerWeek').textContent = '未设置学期';
        }
    },

    /**
     * 更新设置页面显示
     */
    updateSettingsDisplay() {
        const settings = this.getSettings();

        // 更新课程名称输入框
        document.getElementById('courseName').value = settings.courseName || '';

        document.getElementById('semesterStart').value = settings.semesterStart || '';
        document.getElementById('semesterEnd').value = settings.semesterEnd || '';

        // 更新动态点名效果复选框状态
        const celebrationCheckbox = document.getElementById('enableCelebration');
        if (celebrationCheckbox) {
            celebrationCheckbox.checked = settings.enableCelebration !== false;
        }

        // 更新学期信息显示
        const infoEl = document.getElementById('semesterInfo');
        if (settings.semesterStart && settings.semesterEnd) {
            const currentWeek = this.getCurrentWeek();
            const startArr = settings.semesterStart.split('-');
            const endArr = settings.semesterEnd.split('-');

            let infoHtml = `
                <div class="semester-detail">
                    <p><strong>学期时间：</strong>${startArr[1]}月${startArr[2]}日 - ${endArr[1]}月${endArr[2]}日</p>
            `;

            if (currentWeek !== null) {
                infoHtml += `<p><strong>当前周次：</strong>第${currentWeek}周</p>`;
            } else {
                const today = this.parseLocalDate(this.getToday());
                const startDate = this.parseLocalDate(settings.semesterStart);
                if (today < startDate) {
                    const diffDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
                    infoHtml += `<p><strong>距离开学：</strong>${diffDays}天</p>`;
                }
            }

            infoHtml += `</div>`;
            infoEl.innerHTML = infoHtml;
        } else {
            infoEl.innerHTML = '<p>请设置学期时间以启用周数计算功能</p>';
        }
    },

    /**
     * 处理保存设置
     */
    handleSaveSettings() {
        const courseName = document.getElementById('courseName').value.trim();
        const start = document.getElementById('semesterStart').value;
        const end = document.getElementById('semesterEnd').value;
        const enableCelebration = document.getElementById('enableCelebration').checked;

        // 学期日期不是必填的，可以只保存其他设置
        if (start && end) {
            if (this.parseLocalDate(start) >= this.parseLocalDate(end)) {
                showToast('结束日期必须晚于开始日期', 'error');
                return;
            }
        }

        this.saveSettings({
            courseName: courseName,
            semesterStart: start || null,
            semesterEnd: end || null,
            enableCelebration: enableCelebration
        });

        this.updateHeaderDisplay();
        this.updateSettingsDisplay();
        GradeModule.renderGradeList();

        showToast('设置已保存', 'success');
    },

    /**
     * 初始化
     */
    init() {
        // 保存按钮
        document.getElementById('btnSaveSettings').addEventListener('click', () => {
            this.handleSaveSettings();
        });

        // 初始显示
        this.updateHeaderDisplay();
        this.updateSettingsDisplay();
    }
};