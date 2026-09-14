/**
 * 课程进度模块
 * 记录和展示课程进度信息（日期、时间、周次、内容）
 */
const CourseProgressModule = {
    // 存储键名
    STORAGE_KEY: 'classroom_course_progress',

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
     * 获取当前时间（本地时间）
     * @returns {string} HH:mm格式
     */
    getNowTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    /**
     * 根据日期计算周次
     * @param {string} dateStr - YYYY-MM-DD格式日期
     * @returns {number|null} 周次
     */
    getWeekByDate(dateStr) {
        if (!dateStr) return null;
        const settings = SettingsModule.getSettings();
        if (!settings.semesterStart) return null;

        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        const startDate = SettingsModule.parseLocalDate(settings.semesterStart);

        const diffTime = targetDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return null;
        return Math.floor(diffDays / 7) + 1;
    },

    /**
     * 获取所有课程进度记录（按创建时间倒序）
     * @returns {Array} 进度记录数组
     */
    getProgressList() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        const list = data ? JSON.parse(data) : [];
        // 按 createdAt 倒序排列（最新在前）
        return list.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * 保存进度记录
     * @param {Array} list - 进度记录数组
     */
    saveProgressList(list) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
        if (typeof markDataChanged === 'function') {
            markDataChanged();
        }
    },

    /**
     * 获取下一个自增ID
     * @returns {number}
     */
    getNextId() {
        const list = this.getProgressList();
        if (list.length === 0) return 1;
        return Math.max(...list.map(item => item.id || 0)) + 1;
    },

    /**
     * 添加进度记录
     * @param {Object} item - {date, time, content}
     */
    addProgress(item) {
        const list = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        const now = new Date();
        list.push({
            id: this.getNextId(),
            date: item.date,
            time: item.time,
            week: this.getWeekByDate(item.date),
            content: item.content,
            createdAt: now.getTime()
        });
        this.saveProgressList(list);
    },

    /**
     * 删除进度记录
     * @param {number} id - 记录ID
     */
    deleteProgress(id) {
        let list = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        list = list.filter(item => item.id !== id);
        this.saveProgressList(list);
    },

    /**
     * 渲染进度列表
     */
    renderProgressList() {
        const list = this.getProgressList();
        const tbody = document.getElementById('progressList');
        const emptyTip = document.getElementById('emptyProgressTip');
        const table = document.getElementById('progressTable');

        if (list.length === 0) {
            tbody.innerHTML = '';
            table.style.display = 'none';
            emptyTip.style.display = 'block';
            return;
        }

        table.style.display = '';
        emptyTip.style.display = 'none';

        tbody.innerHTML = list.map(item => `
            <tr>
                <td>${item.date}</td>
                <td>${item.time}</td>
                <td>${item.week ? '第' + item.week + '周' : '-'}</td>
                <td class="progress-content-cell">${this.escapeHtml(item.content)}</td>
                <td>
                    <button class="record-action-btn delete" title="删除记录" onclick="CourseProgressModule.handleDelete(${item.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    /**
     * HTML转义，防止XSS
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    },

    /**
     * 显示添加进度弹窗
     */
    showAddModal() {
        // 默认填充当前日期和时间
        document.getElementById('progressDate').value = this.getToday();
        document.getElementById('progressTime').value = this.getNowTime();
        document.getElementById('progressContent').value = '';

        // 计算并显示周次
        this.updateWeekDisplay();

        document.getElementById('addProgressModal').classList.add('active');
    },

    /**
     * 根据弹窗中的日期更新周次显示
     */
    updateWeekDisplay() {
        const dateStr = document.getElementById('progressDate').value;
        const week = this.getWeekByDate(dateStr);
        const weekInput = document.getElementById('progressWeek');
        if (week) {
            weekInput.value = `第${week}周`;
        } else if (dateStr) {
            weekInput.value = '未设置学期';
        } else {
            weekInput.value = '';
        }
    },

    /**
     * 确认添加进度
     */
    handleConfirmAdd() {
        const date = document.getElementById('progressDate').value;
        const time = document.getElementById('progressTime').value;
        const content = document.getElementById('progressContent').value.trim();

        if (!date) {
            showToast('请选择日期', 'error');
            return;
        }
        if (!content) {
            showToast('请输入进度内容', 'error');
            return;
        }

        this.addProgress({ date, time, content });

        // 关闭弹窗
        document.getElementById('addProgressModal').classList.remove('active');

        // 刷新列表
        this.renderProgressList();
        showToast('进度记录已添加', 'success');
    },

    /**
     * 处理删除
     * @param {number} id
     */
    handleDelete(id) {
        if (!confirm('确定要删除这条进度记录吗？')) return;
        this.deleteProgress(id);
        this.renderProgressList();
        showToast('记录已删除', 'success');
    },

    /**
     * 初始化
     */
    init() {
        // 添加进度按钮
        document.getElementById('btnAddProgress').addEventListener('click', () => {
            this.showAddModal();
        });

        // 确认添加按钮
        document.getElementById('btnConfirmAddProgress').addEventListener('click', () => {
            this.handleConfirmAdd();
        });

        // 日期变化时更新周次
        document.getElementById('progressDate').addEventListener('change', () => {
            this.updateWeekDisplay();
        });

        // 初始渲染
        this.renderProgressList();
    }
};
