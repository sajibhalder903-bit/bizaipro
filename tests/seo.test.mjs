import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seoChecklist,searchTitle,descriptionSuggestion} from '../shared/seo.mjs';
test('SEO guidance detects structural issues without inventing a minimum word count',()=>{
 const report=seoChecklist({title:'Helpful guide',content:'<h1>Duplicate title</h1><h3>Skipped</h3><p>A short answer.</p><img src="a"><img src="b" alt="">',noindex:true});
 assert.equal(report.missingAlt,1);
 assert.equal(report.checks.find(c=>c.id==='hierarchy').passed,false);
 assert.equal(report.checks.find(c=>c.id==='indexing').passed,false);
 assert.equal(report.checks.find(c=>c.id==='body').passed,true);
});
test('internal links require the actual origin and ignore anchors or mail links',()=>{
 const report=seoChecklist({content:'<a href="/guide/">Good</a><a href="https://bizaipro.com/other/">Good</a><a href="https://bizaipro.com.evil.test/">External</a><a href="#top">Top</a><a href="mailto:hello@example.com">Email</a>'});
 assert.equal(report.internalLinks,2);assert.equal(report.externalLinks,1);
});
test('preview matches title fallback and descriptions are text, not executable HTML',()=>{
 assert.equal(searchTitle({title:'Guide'},'My Brand'),'Guide | My Brand');
 assert.equal(searchTitle({title:'Guide',seoTitle:'Custom'}),'Custom');
 assert.equal(descriptionSuggestion({content:'<script>bad()</script><p>Readable answer.</p>'}),'Readable answer.');
 assert.ok(descriptionSuggestion({content:'Useful words '.repeat(100)}).length<=160);
 const report=seoChecklist({title:'বাংলা ব্যবসা',focusKeyword:'বাংলা',content:'<h2>বাংলা ব্যবসা</h2><p>বাংলা তথ্য</p>'});
 assert.equal(report.checks.find(c=>c.id==='keyword').passed,true);
});
