---
title: Smoke
---

````tabsdown
config: position=top, layout=multi, density=compact, personality=separator, palette=secondary, alignment=center

tab: icon:code **Outer**

A [[target|fenced wikilink]] and a ==fenced highlight==.

> [!note] Fenced callout
> Fenced callout body.

[Fenced reference][shared]

```tabsdown
tab: Inner A
tab: Inner B
```

%% tabs %%
%% tab: Marker in fence A %%
Nested marker body.
%% tab: Marker in fence B %%
%% endtabs %%

tab: [Second](https://example.test) <img src=x>
````

%% tabs %%
%% config: position=left, layout=multi %%
%% tab: icon:book **First** %%
A [[target|marker wikilink]] and a ==marker highlight==.

> [!tip] Marker callout
> Marker callout body.

[Marker reference][shared]

```tabsdown
tab: Fence in marker A
tab: Fence in marker B
```

%% tabs %%
%% tab: Nested marker A %%
Nested marker content.
%% tab: Nested marker B %%
%% endtabs %%
%% tab: Second %%
More marker content.
%% endtabs %%

- Container list

  %% tabs %%
  %% tab: List A %%
  List panel body.
  %% tab: List B %%
  %% endtabs %%

  %% tabs %%
  %% tab: List sibling A %%
  List sibling body.
  %% tab: List sibling B %%
  %% endtabs %%

> %% tabs %%
> %% tab: Quote A %%
> Quote panel body.
> %% tab: Quote B %%
> %% endtabs %%
>
> %% tabs %%
> %% tab: Quote sibling A %%
> Quote sibling body.
> %% tab: Quote sibling B %%
> %% endtabs %%
>
> ```text
> %% tabs %%
> %% tab: Quoted literal A %%
> %% tab: Quoted literal B %%
> %% endtabs %%
> ```

100. Ordered container

     %% tabs %%
     %% tab: Ordered A %%
     Ordered panel body.
     %% tab: Ordered B %%
     %% endtabs %%

%% ordinary-comment-must-disappear %%

```text
%% tabs %%
%% tab: Literal A %%
%% tab: Literal B %%
%% endtabs %%
```

[shared]: https://example.test/shared "Document reference"
