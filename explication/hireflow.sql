-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 28, 2026 at 01:55 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hireflow`
--

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `budget` int(11) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'Web Development',
  `report_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`id`, `title`, `description`, `budget`, `status`, `client_id`, `created_at`, `category`, `report_count`) VALUES
(1, 'Build Portfolio Website', 'Create a modern responsive portfolio using Angular.', 150, 'completed', 7, NULL, 'Web Development', 0),
(2, 'UI Design for Mobile App', 'Design clean UI for student productivity app.', 120, 'open', 6, NULL, 'UI/UX Design', 0),
(3, 'Brand Identity & Logo', 'Minimalist logo and brand kit for a tech startup.', 60, 'in_progress', 7, NULL, 'Graphic Design', 0),
(4, 'Fix Backend Bugs', 'Debug FastAPI endpoints and fix issues.', 80, 'in_progress', 7, NULL, 'Web Development', 0),
(5, 'React Native Fitness App', 'Build a cross-platform fitness tracking app with workout logging.', 400, 'open', 6, NULL, 'Mobile App Development', 0),
(6, 'Landing Page Content', 'Write SEO-friendly content for a SaaS landing page.', 70, 'open', 7, NULL, 'Content Writing', 1),
(7, 'Mobile Game 2D Assets', 'Create 2D sprite sheets and UI assets for a mobile endless runner.', 140, 'open', 6, NULL, 'Game Development', 0),
(8, 'E-commerce Platform', 'Full-stack e-commerce site with cart, payments and admin panel.', 300, 'open', 7, NULL, 'Web Development', 0),
(9, 'Admin Dashboard UI', 'Design a clean admin dashboard with charts and data tables.', 110, 'open', 6, NULL, 'UI/UX Design', 0),
(10, 'Sales Data Analysis', 'Analyze 2 years of sales data and produce visual insights report.', 90, 'in_progress', 7, NULL, 'Data Analysis', 0),
(16, 'Product 3D Visualization', 'Create photorealistic 3D renders of furniture products for an online store.', 500, 'open', 10, '2026-04-21 09:19:23', '3D Modeling', 0),
(17, 'Chatbot with NLP', 'Build a customer support chatbot using a pre-trained LLM and fine-tuning.', 350, 'open', 6, '2026-04-21 10:00:00', 'AI / Machine Learning', 0),
(18, 'Penetration Testing Report', 'Perform a black-box pentest on a web app and deliver a detailed findings report.', 600, 'open', 7, '2026-04-21 10:15:00', 'Cybersecurity', 0),
(19, 'CI/CD Pipeline Setup', 'Set up GitHub Actions pipeline with Docker, automated tests and staging deployment.', 250, 'open', 10, '2026-04-21 10:30:00', 'DevOps', 0),
(20, 'Tech Blog Articles', 'Write 5 in-depth technical articles on cloud computing topics.', 180, 'open', 7, '2026-04-21 10:45:00', 'Content Writing', 0);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(300) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`, `created_at`) VALUES
(1, 1, 'report_proposal', 'Proposal reported: Proposal on \'Landing Page Content\'', 'User \'saadani talelllll\' reported Proposal on \'Landing Page Content\'. Reason: test report. Total reports: 1', '/admin?section=reports&type=proposal&id=9', 0, '2026-04-27 23:45:05'),
(2, 2, 'report_proposal', 'Proposal reported: Proposal on \'Landing Page Content\'', 'User \'saadani talelllll\' reported Proposal on \'Landing Page Content\'. Reason: test report. Total reports: 1', '/admin?section=reports&type=proposal&id=9', 1, '2026-04-27 23:45:05'),
(3, 1, 'report_job', 'Job reported: Landing Page Content', 'User \'karnit67\' reported job \'Landing Page Content\'. Reason: hahaha. Total reports: 1', '/admin?section=reports&type=job&id=6', 0, '2026-04-27 23:48:18'),
(4, 2, 'report_job', 'Job reported: Landing Page Content', 'User \'karnit67\' reported job \'Landing Page Content\'. Reason: hahaha. Total reports: 1', '/admin?section=reports&type=job&id=6', 0, '2026-04-27 23:48:18'),
(5, 10, 'new_proposal', 'New proposal on \'Product 3D Visualization\'', 'karnit67 submitted a proposal for your job \'Product 3D Visualization\'.', '/client-dashboard?section=proposals&job_id=16', 0, '2026-04-27 23:48:44');

-- --------------------------------------------------------

--
-- Table structure for table `proposals`
--

CREATE TABLE `proposals` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `freelancer_id` int(11) NOT NULL,
  `message` varchar(255) NOT NULL,
  `price` int(11) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `report_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `proposals`
--

INSERT INTO `proposals` (`id`, `job_id`, `freelancer_id`, `message`, `price`, `status`, `created_at`, `report_count`) VALUES
(1, 1, 8, 'aman e9blni', 999, 'accepted', '2026-04-19 10:10:51', 0),
(5, 2, 8, 'haaaaaaaaaaaaaa', 77, 'pending', '2026-04-19 16:00:18', 0),
(8, 10, 8, 'aaaaaaaaaaaaaaaa', 9999, 'accepted', '2026-04-19 16:03:34', 0),
(9, 6, 8, 'idabzbdbhahbdzabh', 5841, 'rejected', '2026-04-19 16:03:57', 1),
(10, 8, 8, 'message tbdl', 8889, 'rejected', '2026-04-19 16:04:31', 0),
(11, 4, 8, 'ianiazbiazdbhihadbh', 69, 'accepted', '2026-04-20 11:27:06', 0),
(12, 1, 11, 'iadizaindazniazdnidazin', 555, 'rejected', '2026-04-20 11:29:37', 0),
(14, 18, 8, '5demi 3ndk', 10, 'rejected', '2026-04-24 13:41:19', 0),
(15, 20, 8, 'test message 1', 99, 'pending', '2026-04-24 14:58:01', 0),
(16, 20, 11, 'test message 2', 9999, 'pending', '2026-04-24 14:58:39', 0),
(17, 19, 8, 'wanna add me as a friend ?', 100, 'pending', '2026-04-27 20:33:25', 0),
(18, 5, 8, 'bigmamaaaaaaaa', 69, 'pending', '2026-04-27 20:34:29', 0),
(19, 16, 8, 'n7eb n5dem 3ych 5oya', 1, 'pending', '2026-04-27 23:48:44', 0);

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `target_type` varchar(20) NOT NULL COMMENT 'job or proposal',
  `target_id` int(11) NOT NULL,
  `reason` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `reporter_id`, `target_type`, `target_id`, `reason`, `created_at`) VALUES
(1, 7, 'proposal', 9, 'test report', '2026-04-27 23:45:05'),
(2, 8, 'job', 6, 'hahaha', '2026-04-27 23:48:18');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT '/uploads/default.png'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `created_at`, `profile_image`) VALUES
(1, 'Saada', 'admin1@admin.com', '$2b$12$1QRMqpy9A9QHXF0rvEW3J.C8uOB6e/PBTO4ksNxuG.4bG8/Ar3K9C', 'admin', '2026-04-17 19:11:32', '/uploads/admin.jpg'),
(2, 'Aziz', 'admin2@admin.com', '$2b$12$OzufeNHDH7croO2V0nAaUetUKRu1XDl0ioBxj3/dcoynpYKVfYN0W', 'admin', '2026-04-17 19:11:32', '/uploads/admin.jpg'),
(6, 'aziz', 'aziz@example.com', '$2b$12$nzhHTdJc7Qm9A3af6GO6me6cuMW/07UNxBDLPubMo8Wi44WMuQznK', 'client', '2026-04-18 21:49:40', '/uploads/default.png'),
(7, 'saadani talelllll', 'saadani@gmail.com', '$2b$12$bUrbuWSn5uAt3ry3CSz3XukRFzr0sJ2jYjIBmjurhlkimmoEilxhC', 'client', '2026-04-18 23:56:38', '/uploads/820dadd7-bcfa-4b54-a73f-dd87443a6a8a.jpg'),
(8, 'karnit67', 'karnit@gmail.com', '$2b$12$hUe6DzqhKnJETgoMo4Gi6eAbCm9SRY99ERvK0v8/DY/xmIkyPsPPG', 'freelancer', '2026-04-19 00:01:07', '/uploads/a5d22e79-b94f-4f15-8852-04598f11a368.png'),
(10, 'shady', 'shady@yahoo.com', '$2b$12$66S/v2yFcbojRLK8jbjNXuY8tPSSJybU9BHBa6IyedUmjXxd9aLa2', 'client', '2026-04-20 11:22:11', '/uploads/30c651fb-87d7-4223-b390-e37760cae0a4.png'),
(11, 'omar', 'omar@gmail.com', '$2b$12$KbKd8K2MdULZxJiEFt.oYeKlDhjyweh91LVzBEUgOkEv18SkeI3bS', 'freelancer', '2026-04-20 11:28:51', '/uploads/default.png'),
(12, 'pytest', 'pytest@email.com', '$2b$12$MxneFg4lN3N8gM6UIRN2i.r1J4jILeu6JD08PcOnzXZlHmBaudej2', 'client', '2026-04-22 10:09:25', '/uploads/default.png'),
(13, 'pytest999', 'pytest999@email.com', '$2b$12$awVnzSpGp6/SJswg8U3TT.6RDZO.wdxO.UgJlVv/lmO6dik4xiXAm', 'freelancer', '2026-04-22 10:18:50', '/uploads/default.png');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `ix_jobs_id` (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `proposals`
--
ALTER TABLE `proposals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_application` (`job_id`,`freelancer_id`),
  ADD KEY `freelancer_id` (`freelancer_id`),
  ADD KEY `ix_proposals_id` (`id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_report` (`reporter_id`,`target_type`,`target_id`),
  ADD KEY `reporter_id` (`reporter_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `ix_users_id` (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `proposals`
--
ALTER TABLE `proposals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `proposals`
--
ALTER TABLE `proposals`
  ADD CONSTRAINT `proposals_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `proposals_ibfk_2` FOREIGN KEY (`freelancer_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
