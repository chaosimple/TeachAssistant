/**
 * 星星评分组件
 * 支持半星，每颗星代表的分值可配置（默认每颗20分，即5颗星 = 100分）
 * 供课堂互动评分、设置页默认评分等场景复用
 */
const StarRating = {
    // 每颗星默认对应的分数
    POINTS_PER_STAR: 20,

    /**
     * 创建星星评分组件实例
     * @param {Object} options - 配置项
     * @param {string} options.containerId - 星星容器元素ID
     * @param {string} [options.scoreDisplayId] - 分数显示元素ID
     * @param {number} [options.pointsPerStar] - 每颗星代表的分数，默认20（5颗星 = 100分）
     * @param {number} [options.initialScore] - 初始分数，默认0
     * @param {Function} [options.onChange] - 用户点击星星后的回调，参数为最新分数
     * @param {Function} [options.onPreview] - 悬停预览回调，参数为预览分数；鼠标移出时传 null
     * @returns {Object} 组件实例 {getScore, setScore}
     */
    create({ containerId, scoreDisplayId, pointsPerStar = this.POINTS_PER_STAR, initialScore = 0, onChange, onPreview }) {
        const container = document.getElementById(containerId);
        const stars = Array.from(container.querySelectorAll('.star'));
        const scoreEl = scoreDisplayId ? document.getElementById(scoreDisplayId) : null;

        let score = 0;

        // 分数与星数的换算（按本组星星的分值）
        const scoreToStars = (value) => (Number(value) || 0) / pointsPerStar;
        const starsToScore = (value) => Math.round(value * pointsPerStar);

        // 更新分数显示
        const renderScore = (value) => {
            if (scoreEl) scoreEl.textContent = value;
        };

        /**
         * 按分值点亮星星
         * @param {number} value - 分数 (0-100)
         * @param {string} fullClass - 整星样式类
         * @param {string} halfClass - 半星样式类
         */
        const paint = (value, fullClass, halfClass) => {
            const starValue = scoreToStars(value);
            stars.forEach((star, index) => {
                star.classList.remove(fullClass, halfClass);
                if (index + 1 <= starValue) {
                    star.classList.add(fullClass);
                } else if (index < starValue) {
                    // 处于星值小数部分的星星显示为半星
                    star.classList.add(halfClass);
                }
            });
        };

        const clearHover = () => {
            stars.forEach(star => star.classList.remove('hover', 'hover-half'));
        };

        /**
         * 根据鼠标位置计算星数（点击星星左半边取半星）
         * @param {HTMLElement} star - 当前星星元素
         * @param {number} index - 星星下标（从0开始）
         * @param {MouseEvent} event - 鼠标事件
         * @returns {number} 星数
         */
        const starValueFromEvent = (star, index, event) => {
            const rect = star.getBoundingClientRect();
            const isLeftHalf = event.clientX - rect.left < rect.width / 2;
            return index + 1 - (isLeftHalf ? 0.5 : 0);
        };

        stars.forEach((star, index) => {
            // 悬停预览
            star.addEventListener('mousemove', (event) => {
                const hoverScore = starsToScore(starValueFromEvent(star, index, event));
                paint(hoverScore, 'hover', 'hover-half');
                renderScore(hoverScore);
                if (typeof onPreview === 'function') onPreview(hoverScore);
            });

            // 移出后恢复为已选分数
            star.addEventListener('mouseleave', () => {
                clearHover();
                renderScore(score);
                if (typeof onPreview === 'function') onPreview(null);
            });

            // 点击选择
            star.addEventListener('click', (event) => {
                score = starsToScore(starValueFromEvent(star, index, event));
                renderScore(score);
                paint(score, 'active', 'half');
                if (typeof onChange === 'function') onChange(score);
            });
        });

        const instance = {
            /**
             * 获取当前分数
             * @returns {number} 分数 (0-100)
             */
            getScore() {
                return score;
            },

            /**
             * 设置分数（同步更新星星与分数显示）
             * @param {number} value - 分数 (0-100)
             */
            setScore(value) {
                score = Number(value) || 0;
                renderScore(score);
                clearHover();
                paint(score, 'active', 'half');
            }
        };

        instance.setScore(initialScore);
        return instance;
    }
};
