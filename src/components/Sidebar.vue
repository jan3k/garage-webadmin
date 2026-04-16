<script setup lang="ts">
import { RouterLink } from "vue-router"
import Logo from "../assets/img/logo.svg?raw"
</script>
<template>
	<div class="sidebar">
		<router-link to="/" class="sidebar-logo"><Logo /></router-link>
		<nav class="sidebar-nav">
			<ul class="sidebar-navList">
				<li>
					<router-link to="/" class="sidebar-navItem">Overview</router-link>
				</li>
				<li>
					<div class="sidebar-navTitle">Storage</div>
					<ul class="sidebar-navList">
						<li>
							<router-link to="/buckets" class="sidebar-navItem">Buckets</router-link>
						</li>
					</ul>
				</li>
				<li>
					<div class="sidebar-navTitle">Access</div>
					<ul class="sidebar-navList">
						<li>
							<router-link to="/access-keys" class="sidebar-navItem">Access Keys</router-link>
						</li>
						<li>
							<router-link to="/admin-tokens" class="sidebar-navItem">Admin Tokens</router-link>
						</li>
					</ul>
				</li>
				<li>
					<div class="sidebar-navTitle">Cluster</div>
					<ul class="sidebar-navList">
						<li>
							<router-link to="/nodes" class="sidebar-navItem">Nodes</router-link>
						</li>
						<li>
							<router-link to="/layout" class="sidebar-navItem">Layout</router-link>
						</li>
					</ul>
				</li>
			</ul>
		</nav>
	</div>
</template>