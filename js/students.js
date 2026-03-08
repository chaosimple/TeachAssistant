/**
 * 学生管理模块
 * 处理学生数据的增删改查
 */
const StudentModule = {
    // 存储键名
    STORAGE_KEY: 'classroom_students',

    /**
     * 获取所有学生数据
     * @returns {Array} 学生数组
     */
    getStudents() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * 保存学生数据
     * @param {Array} students - 学生数组
     */
    saveStudents(students) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(students));
        // 标记数据已变更
        if (typeof markDataChanged === 'function') {
            markDataChanged();
        }
    },

    /**
     * 添加学生
     * @param {Object} student - 学生对象 {id, name}
     * @returns {boolean} 是否成功
     */
    addStudent(student) {
        const students = this.getStudents();

        // 检查学号是否重复
        if (students.some(s => s.id === student.id)) {
            return false;
        }

        students.push({
            id: student.id,
            name: student.name,
            rollCount: 0
        });

        this.saveStudents(students);
        return true;
    },

    /**
     * 删除学生
     * @param {string} studentId - 学号
     */
    deleteStudent(studentId) {
        let students = this.getStudents();
        students = students.filter(s => s.id !== studentId);
        this.saveStudents(students);
    },

    /**
     * 批量导入学生
     * @param {Array} newStudents - 新学生数组
     * @returns {Object} {success: 成功数量, duplicate: 重复数量}
     */
    importStudents(newStudents) {
        const students = this.getStudents();
        const existingIds = new Set(students.map(s => s.id));

        let success = 0;
        let duplicate = 0;

        newStudents.forEach(student => {
            if (existingIds.has(student.id)) {
                duplicate++;
            } else {
                students.push({
                    id: student.id,
                    name: student.name,
                    rollCount: student.rollCount || 0
                });
                existingIds.add(student.id);
                success++;
            }
        });

        this.saveStudents(students);
        return { success, duplicate };
    },

    /**
     * 清空所有学生数据
     */
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * 更新学生点名次数
     * @param {string} studentId - 学号
     * @param {number} increment - 增量（默认1）
     */
    updateRollCount(studentId, increment = 1) {
        const students = this.getStudents();
        const student = students.find(s => s.id === studentId);
        if (student) {
            student.rollCount = (student.rollCount || 0) + increment;
            this.saveStudents(students);
        }
    },

    /**
     * 减少学生点名次数（用于删除互动记录时）
     * @param {string} studentId - 学号
     */
    decrementRollCount(studentId) {
        const students = this.getStudents();
        const student = students.find(s => s.id === studentId);
        if (student && student.rollCount > 0) {
            student.rollCount--;
            this.saveStudents(students);
        }
    },

    /**
     * 获取学生点名次数
     * @param {string} studentId - 学号
     * @returns {number} 点名次数
     */
    getRollCount(studentId) {
        const students = this.getStudents();
        const student = students.find(s => s.id === studentId);
        return student ? (student.rollCount || 0) : 0;
    },

    /**
     * 渲染学生列表
     */
    renderStudentList() {
        const students = this.getStudents();
        const tbody = document.getElementById('studentList');
        const emptyTip = document.getElementById('emptyStudentTip');

        if (students.length === 0) {
            tbody.innerHTML = '';
            emptyTip.style.display = 'block';
            return;
        }

        emptyTip.style.display = 'none';

        tbody.innerHTML = students.map((student, index) => {
            const stats = AttendanceModule.getStudentStats(student.id);
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student.id}</td>
                    <td>${student.name}</td>
                    <td>${student.rollCount || 0}</td>
                    <td><span class="score-badge">${stats.avgScore}</span></td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="StudentModule.handleDelete('${student.id}')">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * 处理删除学生
     * @param {string} studentId - 学号
     */
    handleDelete(studentId) {
        if (confirm('确定要删除该学生吗？相关记录将一并删除。')) {
            this.deleteStudent(studentId);
            // 同时删除相关记录
            AttendanceModule.deleteRecordsByStudent(studentId);
            GradeModule.deleteGradeByStudent(studentId);

            this.renderStudentList();
            showToast('学生已删除', 'success');
        }
    },

    /**
     * 初始化事件监听
     */
    init() {
        // 导入按钮
        document.getElementById('btnImport').addEventListener('click', () => {
            document.getElementById('fileImport').click();
        });

        // 文件选择
        document.getElementById('fileImport').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const students = await ExcelModule.importStudents(file);
                const result = this.importStudents(students);

                this.renderStudentList();
                showToast(`成功导入 ${result.success} 名学生${result.duplicate > 0 ? `，${result.duplicate} 名重复已跳过` : ''}`, 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }

            // 清空文件选择，允许重复选择同一文件
            e.target.value = '';
        });

        // 添加学生按钮
        document.getElementById('btnAddStudent').addEventListener('click', () => {
            document.getElementById('addStudentModal').classList.add('active');
            document.getElementById('studentId').focus();
        });

        // 确认添加
        document.getElementById('btnConfirmAdd').addEventListener('click', () => {
            const id = document.getElementById('studentId').value.trim();
            const name = document.getElementById('studentName').value.trim();

            if (!id || !name) {
                showToast('请填写完整信息', 'error');
                return;
            }

            if (this.addStudent({ id, name })) {
                this.renderStudentList();
                document.getElementById('addStudentModal').classList.remove('active');
                document.getElementById('studentId').value = '';
                document.getElementById('studentName').value = '';
                showToast('学生添加成功', 'success');
            } else {
                showToast('学号已存在', 'error');
            }
        });

        // 清空全部
        document.getElementById('btnClearAll').addEventListener('click', () => {
            if (confirm('确定要清空所有学生数据吗？此操作不可恢复！')) {
                this.clearAll();
                AttendanceModule.clearAll();
                GradeModule.clearAll();
                this.renderStudentList();
                showToast('数据已清空', 'success');
            }
        });

        // 初始渲染
        this.renderStudentList();
    }
};