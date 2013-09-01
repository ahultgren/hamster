"use strict";

module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        globalstrict: true,
        node: true
      },
      files: {
        src: ['Gruntfile.js', 'package.json', 'index.js', 'lib/*.js', 'test/*.js']
      }
    },
    watch: {
      files: ['<%= jshint.files.src %>'],
      tasks: ['default']
    }
  });

  // npm tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task.
  grunt.registerTask('default', ['jshint']);
};
